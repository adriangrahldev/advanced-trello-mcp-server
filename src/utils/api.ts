import { TrelloApiResponse, TrelloCredentials } from '../types/common.js';
import https from 'node:https';

// Persistent keep-alive agent — reuses TLS connections to avoid CloudFront blocking
const keepAliveAgent = new https.Agent({
	keepAlive: true,
	keepAliveMsecs: 60_000,
	maxSockets: 4,
	timeout: 60_000,
});

const MAX_RETRIES = 7;
const BASE_DELAY_MS = 1500;
const FETCH_TIMEOUT_MS = 60_000;

// Trello limits: 100 req / 10 sec per token, 300 req / 10 sec per key
// We target 80 req / 10 sec to stay safely under the token limit
const WINDOW_MS = 10_000;
const MAX_REQUESTS_PER_WINDOW = 80;
const MIN_REQUEST_INTERVAL_MS = 120; // ~8 req/sec max serial throughput

// ── Sliding Window Rate Limiter ──────────────────────────────────────
// Tracks timestamps of all requests in the last WINDOW_MS
const requestTimestamps: number[] = [];
let requestCount = 0;

function pruneWindow(): void {
	const cutoff = Date.now() - WINDOW_MS;
	while (requestTimestamps.length > 0 && requestTimestamps[0] <= cutoff) {
		requestTimestamps.shift();
	}
}

function getWindowUsage(): { count: number; oldestAge: number } {
	pruneWindow();
	const oldest = requestTimestamps.length > 0 ? Date.now() - requestTimestamps[0] : WINDOW_MS;
	return { count: requestTimestamps.length, oldestAge: oldest };
}

// ── Mutex for serializing access to the rate limiter ─────────────────
// Prevents race conditions when multiple tool calls fire concurrently
let mutexQueue: Array<() => void> = [];
let mutexLocked = false;

async function acquireMutex(): Promise<void> {
	if (!mutexLocked) {
		mutexLocked = true;
		return;
	}
	return new Promise(resolve => {
		mutexQueue.push(() => {
			mutexLocked = true;
			resolve();
		});
	});
}

function releaseMutex(): void {
	if (mutexQueue.length > 0) {
		const next = mutexQueue.shift()!;
		next();
	} else {
		mutexLocked = false;
	}
}

// ── Throttle with sliding window + mutex ─────────────────────────────
async function throttle(): Promise<void> {
	await acquireMutex();
	try {
		// Enforce minimum interval between requests
		const now = Date.now();
		const lastTs = requestTimestamps.length > 0
			? requestTimestamps[requestTimestamps.length - 1]
			: 0;
		const elapsed = now - lastTs;
		if (elapsed < MIN_REQUEST_INTERVAL_MS) {
			await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
		}

		// Enforce sliding window limit
		const { count } = getWindowUsage();
		if (count >= MAX_REQUESTS_PER_WINDOW) {
			// Wait until the oldest request falls out of the window
			const waitMs = WINDOW_MS - (Date.now() - requestTimestamps[0]) + 50; // +50ms safety margin
			console.error(`[TRELLO_MCP] Rate limit: ${count}/${MAX_REQUESTS_PER_WINDOW} in window, waiting ${waitMs}ms`);
			await new Promise(resolve => setTimeout(resolve, Math.max(waitMs, 100)));
			pruneWindow();
		}

		requestTimestamps.push(Date.now());
		requestCount++;
	} finally {
		releaseMutex();
	}
}

// ── Jitter helper ────────────────────────────────────────────────────
function jitter(baseMs: number): number {
	// Add ±25% random jitter to prevent thundering herd
	const factor = 0.75 + Math.random() * 0.5;
	return Math.round(baseMs * factor);
}

/**
 * Fetch wrapper using keep-alive https agent for Trello API URLs.
 * Falls back to regular fetch for non-Trello URLs.
 */
function keepAliveFetch(url: string, options?: RequestInit): Promise<Response> {
	// Use keep-alive agent for Trello requests
	if (url.includes('trello.com')) {
		return new Promise((resolve, reject) => {
			const parsedUrl = new URL(url);
			const reqOptions: https.RequestOptions = {
				hostname: parsedUrl.hostname,
				path: parsedUrl.pathname + parsedUrl.search,
				method: options?.method || 'GET',
				agent: keepAliveAgent,
				headers: {
					...(options?.headers as Record<string, string> || {}),
				},
				signal: options?.signal as AbortSignal | undefined,
			};

			const req = https.request(reqOptions, (res) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk: Buffer) => chunks.push(chunk));
				res.on('end', () => {
					const body = Buffer.concat(chunks);
					resolve(new Response(body, {
						status: res.statusCode || 200,
						statusText: res.statusMessage || '',
						headers: new Headers(res.headers as Record<string, string>),
					}));
				});
			});

			req.on('error', reject);
			req.on('timeout', () => {
				req.destroy();
				reject(new Error('Request timeout'));
			});

			if (options?.body) {
				req.write(options.body);
			}
			req.end();
		});
	}
	return fetch(url, options);
}

/**
 * Fetch with keep-alive + timeout + sliding window rate limit + exponential backoff retry with jitter.
 * Retries on network errors, 429 rate limits, and 5xx server errors.
 */
export async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
	await throttle();

	const endpoint = url.replace(/https:\/\/api\.trello\.com\/1/, '').replace(/\?.*/, '');
	const method = options?.method || 'GET';
	const reqNum = requestCount;
	const { count } = getWindowUsage();
	console.error(`[TRELLO_MCP] #${reqNum} ${method} ${endpoint} [window: ${count}/${MAX_REQUESTS_PER_WINDOW}]`);

	let lastError: Error | undefined;
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
			const response = await keepAliveFetch(url, {
				...options,
				signal: controller.signal,
			});
			clearTimeout(timeout);

			// Retry on 429 and 5xx
			if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES - 1) {
				const retryAfter = response.headers.get('Retry-After');
				let delay: number;
				if (retryAfter) {
					delay = parseInt(retryAfter, 10) * 1000;
				} else if (response.status === 429) {
					// On 429, use longer backoff since we've hit the limit
					delay = jitter(BASE_DELAY_MS * Math.pow(2, attempt + 1));
				} else {
					delay = jitter(BASE_DELAY_MS * Math.pow(2, attempt));
				}
				console.error(`[TRELLO_MCP] #${reqNum} → ${response.status}, retry in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
				await new Promise(resolve => setTimeout(resolve, delay));
				// Re-throttle before retry to respect the window
				await throttle();
				continue;
			}
			console.error(`[TRELLO_MCP] #${reqNum} → ${response.status}`);
			return response;
		} catch (error) {
			lastError = error as Error;
			const delay = jitter(BASE_DELAY_MS * Math.pow(2, attempt));
			console.error(`[TRELLO_MCP] #${reqNum} → ERROR: ${(error as Error).message}, retry in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
			if (attempt < MAX_RETRIES - 1) {
				await new Promise(resolve => setTimeout(resolve, delay));
				await throttle();
			}
		}
	}
	throw lastError;
}

/**
 * Create a success response for Trello API
 */
export function createSuccessResponse(data: any): TrelloApiResponse {
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify(data),
			},
		],
	};
}

/**
 * Create an error response for Trello API
 */
export function createErrorResponse(message: string): TrelloApiResponse {
	return {
		content: [
			{
				type: 'text',
				text: message,
			},
		],
		isError: true,
	};
}

/**
 * Check if Trello API credentials are configured
 */
export function validateCredentials(credentials: TrelloCredentials): boolean {
	return !!(credentials.apiKey && credentials.apiToken);
}

/**
 * Create a Trello API URL with credentials
 */
export function createTrelloUrl(endpoint: string, credentials: TrelloCredentials, params?: Record<string, string>): string {
	const url = new URL(`https://api.trello.com/1${endpoint}`);
	url.searchParams.append('key', credentials.apiKey);
	url.searchParams.append('token', credentials.apiToken);

	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				url.searchParams.append(key, value);
			}
		});
	}

	return url.toString();
}

/**
 * Make a GET request to Trello API
 */
export async function trelloGet(endpoint: string, credentials: TrelloCredentials, params?: Record<string, string>): Promise<TrelloApiResponse> {
	try {
		if (!validateCredentials(credentials)) {
			return createErrorResponse('Trello API credentials are not configured');
		}

		const url = createTrelloUrl(endpoint, credentials, params);
		const response = await fetchWithRetry(url);
		const data = await response.json();

		return createSuccessResponse(data);
	} catch (error) {
		return createErrorResponse(`Error making GET request to ${endpoint}: ${error}`);
	}
}

/**
 * Make a POST request to Trello API
 */
export async function trelloPost(endpoint: string, credentials: TrelloCredentials, body?: any, params?: Record<string, string>): Promise<TrelloApiResponse> {
	try {
		if (!validateCredentials(credentials)) {
			return createErrorResponse('Trello API credentials are not configured');
		}

		const url = createTrelloUrl(endpoint, credentials, params);
		const response = await fetchWithRetry(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: body ? JSON.stringify(body) : undefined,
		});
		const data = await response.json();

		return createSuccessResponse(data);
	} catch (error) {
		return createErrorResponse(`Error making POST request to ${endpoint}: ${error}`);
	}
}

/**
 * Make a PUT request to Trello API
 */
export async function trelloPut(endpoint: string, credentials: TrelloCredentials, body?: any, params?: Record<string, string>): Promise<TrelloApiResponse> {
	try {
		if (!validateCredentials(credentials)) {
			return createErrorResponse('Trello API credentials are not configured');
		}

		const url = createTrelloUrl(endpoint, credentials, params);
		const response = await fetchWithRetry(url, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: body ? JSON.stringify(body) : undefined,
		});
		const data = await response.json();

		return createSuccessResponse(data);
	} catch (error) {
		return createErrorResponse(`Error making PUT request to ${endpoint}: ${error}`);
	}
}

/**
 * Make a DELETE request to Trello API
 */
export async function trelloDelete(endpoint: string, credentials: TrelloCredentials, params?: Record<string, string>): Promise<TrelloApiResponse> {
	try {
		if (!validateCredentials(credentials)) {
			return createErrorResponse('Trello API credentials are not configured');
		}

		const url = createTrelloUrl(endpoint, credentials, params);
		const response = await fetchWithRetry(url, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		const data = await response.json();

		return createSuccessResponse(data);
	} catch (error) {
		return createErrorResponse(`Error making DELETE request to ${endpoint}: ${error}`);
	}
}
