import { TrelloApiResponse, TrelloCredentials } from '../types/common.js';
import https from 'node:https';

// Persistent keep-alive agent — reuses TLS connections to avoid CloudFront blocking
const keepAliveAgent = new https.Agent({
	keepAlive: true,
	keepAliveMsecs: 60_000,
	maxSockets: 2,
	timeout: 60_000,
});

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 60_000;

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
 * Fetch with keep-alive + timeout + exponential backoff retry.
 * Retries on network errors, 429 rate limits, and 5xx server errors.
 */
export async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
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
				const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_DELAY_MS * Math.pow(2, attempt);
				await new Promise(resolve => setTimeout(resolve, delay));
				continue;
			}
			return response;
		} catch (error) {
			lastError = error as Error;
			if (attempt < MAX_RETRIES - 1) {
				await new Promise(resolve => setTimeout(resolve, BASE_DELAY_MS * Math.pow(2, attempt)));
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