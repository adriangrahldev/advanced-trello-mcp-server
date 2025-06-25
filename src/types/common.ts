import { z } from 'zod';

// Common Trello API response structure
export interface TrelloApiResponse<T = any> {
	content: Array<{
		type: 'text';
		text: string;
	}>;
	isError?: boolean;
}

// Common error response
export interface TrelloErrorResponse {
	content: Array<{
		type: 'text';
		text: string;
	}>;
	isError: true;
}

// Trello color enum for labels and other colored elements
export const TrelloColorEnum = z.enum([
	'yellow',
	'purple',
	'blue',
	'red',
	'green',
	'orange',
	'black',
	'sky',
	'pink',
	'lime',
]);

// Trello color enum with null option
export const TrelloColorWithNullEnum = z.enum([
	'yellow',
	'purple',
	'blue',
	'red',
	'green',
	'orange',
	'black',
	'sky',
	'pink',
	'lime',
	'null'
]);

export type TrelloColor = z.infer<typeof TrelloColorEnum>;
export type TrelloColorWithNull = z.infer<typeof TrelloColorWithNullEnum>;

// Common API credentials interface
export interface TrelloCredentials {
	apiKey: string;
	apiToken: string;
}

// Base tool handler type
export type ToolHandler<T = any> = (params: T) => Promise<TrelloApiResponse>; 