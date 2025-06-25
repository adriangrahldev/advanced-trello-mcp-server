import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TrelloCredentials } from '../types/common.js';

/**
 * Register all Lists API tools
 * Based on https://developer.atlassian.com/cloud/trello/rest/api-group-lists/
 */
export function registerListsTools(server: McpServer, credentials: TrelloCredentials) {
	// GET /boards/{id}/lists - Get lists from a board
	server.tool(
		'get-lists',
		{
			boardId: z.string().describe('ID of the Trello board to get lists from'),
		},
		async ({ boardId }) => {
			try {
				const response = await fetch(
					`https://api.trello.com/1/boards/${boardId}/lists?key=${credentials.apiKey}&token=${credentials.apiToken}`
				);
				const data = await response.json();
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(data),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error getting lists: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// POST /lists - Create a new list
	server.tool(
		'create-list',
		{
			boardId: z.string().describe('ID of the board to create the list in'),
			name: z.string().describe('Name of the list'),
			position: z.string().optional().describe('Position of the list (e.g. "top", "bottom", or a number)'),
		},
		async ({ boardId, name, position = 'bottom' }) => {
			try {
				if (!credentials.apiKey || !credentials.apiToken) {
					return {
						content: [
							{
								type: 'text',
								text: 'Trello API credentials are not configured',
							},
						],
						isError: true,
					};
				}

				const response = await fetch(
					`https://api.trello.com/1/lists?key=${credentials.apiKey}&token=${credentials.apiToken}`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							name,
							idBoard: boardId,
							pos: position,
						}),
					}
				);
				const data = await response.json();
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(data),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error creating list: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// PUT /lists/{id} - Update a list
	server.tool(
		'update-list',
		{
			listId: z.string().describe('ID of the list to update'),
			name: z.string().optional().describe('New name for the list'),
			closed: z.boolean().optional().describe('Whether the list should be closed (archived)'),
			pos: z.union([z.number(), z.string()]).optional().describe('Position of the list'),
			subscribed: z.boolean().optional().describe('Whether to subscribe to the list'),
		},
		async ({ listId, name, closed, pos, subscribed }) => {
			try {
				if (!credentials.apiKey || !credentials.apiToken) {
					return {
						content: [
							{
								type: 'text',
								text: 'Trello API credentials are not configured',
							},
						],
						isError: true,
					};
				}

				const updateData: any = {};
				if (name !== undefined) updateData.name = name;
				if (closed !== undefined) updateData.closed = closed;
				if (pos !== undefined) updateData.pos = pos;
				if (subscribed !== undefined) updateData.subscribed = subscribed;

				const response = await fetch(
					`https://api.trello.com/1/lists/${listId}?key=${credentials.apiKey}&token=${credentials.apiToken}`,
					{
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(updateData),
					}
				);
				const data = await response.json();
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(data),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error updating list: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// PUT /lists/{id}/closed - Archive/unarchive a list
	server.tool(
		'archive-list',
		{
			listId: z.string().describe('ID of the list to archive or unarchive'),
			archived: z.boolean().describe('Whether to archive (true) or unarchive (false) the list'),
		},
		async ({ listId, archived }) => {
			try {
				if (!credentials.apiKey || !credentials.apiToken) {
					return {
						content: [
							{
								type: 'text',
								text: 'Trello API credentials are not configured',
							},
						],
						isError: true,
					};
				}

				const response = await fetch(
					`https://api.trello.com/1/lists/${listId}/closed?key=${credentials.apiKey}&token=${credentials.apiToken}`,
					{
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							value: archived,
						}),
					}
				);
				const data = await response.json();
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(data),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error archiving list: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// PUT /lists/{id}/idBoard - Move list to another board
	server.tool(
		'move-list-to-board',
		{
			listId: z.string().describe('ID of the list to move'),
			boardId: z.string().describe('ID of the destination board'),
		},
		async ({ listId, boardId }) => {
			try {
				if (!credentials.apiKey || !credentials.apiToken) {
					return {
						content: [
							{
								type: 'text',
								text: 'Trello API credentials are not configured',
							},
						],
						isError: true,
					};
				}

				const response = await fetch(
					`https://api.trello.com/1/lists/${listId}/idBoard?key=${credentials.apiKey}&token=${credentials.apiToken}`,
					{
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							value: boardId,
						}),
					}
				);
				const data = await response.json();
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(data),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error moving list to board: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// GET /lists/{id}/actions - Get actions for a list
	server.tool(
		'get-list-actions',
		{
			listId: z.string().describe('ID of the list to get actions for'),
			filter: z.string().optional().describe('Filter for action types'),
		},
		async ({ listId, filter }) => {
			try {
				if (!credentials.apiKey || !credentials.apiToken) {
					return {
						content: [
							{
								type: 'text',
								text: 'Trello API credentials are not configured',
							},
						],
						isError: true,
					};
				}

				const url = new URL(`https://api.trello.com/1/lists/${listId}/actions`);
				url.searchParams.append('key', credentials.apiKey);
				url.searchParams.append('token', credentials.apiToken);
				if (filter) url.searchParams.append('filter', filter);

				const response = await fetch(url.toString());
				const data = await response.json();
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(data),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error getting list actions: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// GET /lists/{id}/board - Get the board of a list
	server.tool(
		'get-list-board',
		{
			listId: z.string().describe('ID of the list to get board for'),
			fields: z.string().optional().describe('Comma-separated list of board fields to include'),
		},
		async ({ listId, fields }) => {
			try {
				if (!credentials.apiKey || !credentials.apiToken) {
					return {
						content: [
							{
								type: 'text',
								text: 'Trello API credentials are not configured',
							},
						],
						isError: true,
					};
				}

				const url = new URL(`https://api.trello.com/1/lists/${listId}/board`);
				url.searchParams.append('key', credentials.apiKey);
				url.searchParams.append('token', credentials.apiToken);
				if (fields) url.searchParams.append('fields', fields);

				const response = await fetch(url.toString());
				const data = await response.json();
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(data),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error getting list board: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// GET /lists/{id}/cards - Get cards from a list
	server.tool(
		'get-list-cards',
		{
			listId: z.string().describe('ID of the list to get cards from'),
			fields: z.string().optional().describe('Comma-separated list of card fields to include'),
			filter: z.string().optional().describe('Filter for card types (e.g., "open", "closed", "all")'),
		},
		async ({ listId, fields, filter }) => {
			try {
				if (!credentials.apiKey || !credentials.apiToken) {
					return {
						content: [
							{
								type: 'text',
								text: 'Trello API credentials are not configured',
							},
						],
						isError: true,
					};
				}

				const url = new URL(`https://api.trello.com/1/lists/${listId}/cards`);
				url.searchParams.append('key', credentials.apiKey);
				url.searchParams.append('token', credentials.apiToken);
				if (fields) url.searchParams.append('fields', fields);
				if (filter) url.searchParams.append('filter', filter);

				const response = await fetch(url.toString());
				const data = await response.json();
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(data),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error getting list cards: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// POST /lists/{id}/archiveAllCards - Archive all cards in a list
	server.tool(
		'archive-all-cards-in-list',
		{
			listId: z.string().describe('ID of the list to archive all cards in'),
		},
		async ({ listId }) => {
			try {
				if (!credentials.apiKey || !credentials.apiToken) {
					return {
						content: [
							{
								type: 'text',
								text: 'Trello API credentials are not configured',
							},
						],
						isError: true,
					};
				}

				const response = await fetch(
					`https://api.trello.com/1/lists/${listId}/archiveAllCards?key=${credentials.apiKey}&token=${credentials.apiToken}`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
					}
				);
				const data = await response.json();
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(data),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error archiving all cards in list: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// POST /lists/{id}/moveAllCards - Move all cards in a list
	server.tool(
		'move-all-cards-in-list',
		{
			listId: z.string().describe('ID of the source list'),
			destinationBoardId: z.string().describe('ID of the destination board'),
			destinationListId: z.string().describe('ID of the destination list'),
		},
		async ({ listId, destinationBoardId, destinationListId }) => {
			try {
				if (!credentials.apiKey || !credentials.apiToken) {
					return {
						content: [
							{
								type: 'text',
								text: 'Trello API credentials are not configured',
							},
						],
						isError: true,
					};
				}

				const response = await fetch(
					`https://api.trello.com/1/lists/${listId}/moveAllCards?key=${credentials.apiKey}&token=${credentials.apiToken}`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							idBoard: destinationBoardId,
							idList: destinationListId,
						}),
					}
				);
				const data = await response.json();
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(data),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error moving all cards in list: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);
} 