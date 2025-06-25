"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuccessResponse = createSuccessResponse;
exports.createErrorResponse = createErrorResponse;
exports.validateCredentials = validateCredentials;
exports.createTrelloUrl = createTrelloUrl;
exports.trelloGet = trelloGet;
exports.trelloPost = trelloPost;
exports.trelloPut = trelloPut;
exports.trelloDelete = trelloDelete;
/**
 * Create a success response for Trello API
 */
function createSuccessResponse(data) {
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
function createErrorResponse(message) {
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
function validateCredentials(credentials) {
    return !!(credentials.apiKey && credentials.apiToken);
}
/**
 * Create a Trello API URL with credentials
 */
function createTrelloUrl(endpoint, credentials, params) {
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
async function trelloGet(endpoint, credentials, params) {
    try {
        if (!validateCredentials(credentials)) {
            return createErrorResponse('Trello API credentials are not configured');
        }
        const url = createTrelloUrl(endpoint, credentials, params);
        const response = await fetch(url);
        const data = await response.json();
        return createSuccessResponse(data);
    }
    catch (error) {
        return createErrorResponse(`Error making GET request to ${endpoint}: ${error}`);
    }
}
/**
 * Make a POST request to Trello API
 */
async function trelloPost(endpoint, credentials, body, params) {
    try {
        if (!validateCredentials(credentials)) {
            return createErrorResponse('Trello API credentials are not configured');
        }
        const url = createTrelloUrl(endpoint, credentials, params);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await response.json();
        return createSuccessResponse(data);
    }
    catch (error) {
        return createErrorResponse(`Error making POST request to ${endpoint}: ${error}`);
    }
}
/**
 * Make a PUT request to Trello API
 */
async function trelloPut(endpoint, credentials, body, params) {
    try {
        if (!validateCredentials(credentials)) {
            return createErrorResponse('Trello API credentials are not configured');
        }
        const url = createTrelloUrl(endpoint, credentials, params);
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await response.json();
        return createSuccessResponse(data);
    }
    catch (error) {
        return createErrorResponse(`Error making PUT request to ${endpoint}: ${error}`);
    }
}
/**
 * Make a DELETE request to Trello API
 */
async function trelloDelete(endpoint, credentials, params) {
    try {
        if (!validateCredentials(credentials)) {
            return createErrorResponse('Trello API credentials are not configured');
        }
        const url = createTrelloUrl(endpoint, credentials, params);
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json();
        return createSuccessResponse(data);
    }
    catch (error) {
        return createErrorResponse(`Error making DELETE request to ${endpoint}: ${error}`);
    }
}
