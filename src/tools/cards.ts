import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TrelloCredentials } from '../types/common.js';

/**
 * Register all Cards API tools
 * Based on https://developer.atlassian.com/cloud/trello/rest/api-group-cards/
 */
export function registerCardsTools(server: McpServer, credentials: TrelloCredentials) {
	// POST /cards - Create a new card
	server.tool(
		'create-card',
		{
			name: z.string().describe('Name of the card'),
			description: z.string().optional().describe('Description of the card'),
			listId: z.string().describe('ID of the list to create the card in'),
		},
		async ({ name, description, listId }) => {
			try {
				const response = await fetch(
					`https://api.trello.com/1/cards?key=${credentials.apiKey}&token=${credentials.apiToken}`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							name,
							desc: description || '',
							idList: listId,
							pos: 'bottom',
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
							text: `Error creating card: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// POST /cards - Create multiple cards
	server.tool(
		'create-cards',
		{
			cards: z.array(
				z.object({
					name: z.string().describe('Name of the card'),
					description: z.string().optional().describe('Description of the card'),
					listId: z.string().describe('ID of the list to create the card in'),
				})
			),
		},
		async ({ cards }) => {
			try {
				const results = await Promise.all(
					cards.map(async (card) => {
						const response = await fetch(
							`https://api.trello.com/1/cards?key=${credentials.apiKey}&token=${credentials.apiToken}`,
							{
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									name: card.name,
									desc: card.description || '',
									idList: card.listId,
									pos: 'bottom',
								}),
							}
						);
						return await response.json();
					})
				);
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(results),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error creating cards: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// PUT /cards/{id}/idList - Move card to another list
	server.tool(
		'move-card',
		{
			cardId: z.string().describe('ID of the card to move'),
			listId: z.string().describe('ID of the destination list'),
			position: z.string().optional().describe('Position in the list (e.g. "top", "bottom")'),
		},
		async ({ cardId, listId, position = 'bottom' }) => {
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
					`https://api.trello.com/1/cards/${cardId}?key=${credentials.apiKey}&token=${credentials.apiToken}`,
					{
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							idList: listId,
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
							text: `Error moving card: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// PUT /cards - Move multiple cards
	server.tool(
		'move-cards',
		{
			cards: z.array(
				z.object({
					cardId: z.string().describe('ID of the card to move'),
					listId: z.string().describe('ID of the destination list'),
					position: z.string().optional().describe('Position in the list (e.g. "top", "bottom")'),
				})
			),
		},
		async ({ cards }) => {
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

				const results = await Promise.all(
					cards.map(async (card) => {
						const response = await fetch(
							`https://api.trello.com/1/cards/${card.cardId}?key=${credentials.apiKey}&token=${credentials.apiToken}`,
							{
								method: 'PUT',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									idList: card.listId,
									pos: card.position || 'bottom',
								}),
							}
						);
						return await response.json();
					})
				);
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(results),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error moving cards: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// POST /cards/{id}/actions/comments - Add comment to card
	server.tool(
		'add-comment',
		{
			cardId: z.string().describe('ID of the card to comment on'),
			text: z.string().describe('Comment text'),
		},
		async ({ cardId, text }) => {
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
					`https://api.trello.com/1/cards/${cardId}/actions/comments?key=${credentials.apiKey}&token=${credentials.apiToken}`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							text,
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
							text: `Error adding comment: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// POST /cards/{id}/actions/comments - Add multiple comments
	server.tool(
		'add-comments',
		{
			comments: z.array(
				z.object({
					cardId: z.string().describe('ID of the card to comment on'),
					text: z.string().describe('Comment text'),
				})
			),
		},
		async ({ comments }) => {
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

				const results = await Promise.all(
					comments.map(async (comment) => {
						const response = await fetch(
							`https://api.trello.com/1/cards/${comment.cardId}/actions/comments?key=${credentials.apiKey}&token=${credentials.apiToken}`,
							{
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									text: comment.text,
								}),
							}
						);
						return await response.json();
					})
				);
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(results),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error adding comments: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// GET /lists/{id}/cards - Get tickets by list (alias for get-list-cards)
	server.tool(
		'get-tickets-by-list',
		{
			listId: z.string().describe('ID of the list to get tickets from'),
			limit: z.number().optional().describe('Maximum number of cards to return'),
		},
		async ({ listId, limit }) => {
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
				if (limit) url.searchParams.append('limit', limit.toString());

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
							text: `Error getting tickets by list: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// PUT /cards/{id}/closed - Archive a card
	server.tool(
		'archive-card',
		{
			cardId: z.string().describe('ID of the card to archive'),
		},
		async ({ cardId }) => {
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
					`https://api.trello.com/1/cards/${cardId}?key=${credentials.apiKey}&token=${credentials.apiToken}`,
					{
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							closed: true,
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
							text: `Error archiving card: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// PUT /cards - Archive multiple cards
	server.tool(
		'archive-cards',
		{
			cardIds: z.array(z.string()).describe('IDs of the cards to archive'),
		},
		async ({ cardIds }) => {
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

				const results = await Promise.all(
					cardIds.map(async (cardId) => {
						const response = await fetch(
							`https://api.trello.com/1/cards/${cardId}?key=${credentials.apiKey}&token=${credentials.apiToken}`,
							{
								method: 'PUT',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									closed: true,
								}),
							}
						);
						return await response.json();
					})
				);
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(results),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error archiving cards: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);
} 