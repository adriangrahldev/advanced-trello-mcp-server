import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TrelloCredentials } from '../types/common.js';
import { fetchWithRetry } from '../utils/api.js';
import fs from 'node:fs/promises';
import path from 'node:path';

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
				const response = await fetchWithRetry(
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
						const response = await fetchWithRetry(
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

	// PUT /cards/{id} - Update a card (description, name, or both)
	server.tool(
		'update-card',
		{
			cardId: z.string().describe('ID of the card to update'),
			description: z.string().optional().describe('New description for the card (replaces existing). Use empty string to clear.'),
			name: z.string().optional().describe('New name/title for the card'),
		},
		async ({ cardId, description, name }) => {
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

				const body: { desc?: string; name?: string } = {};
				if (description !== undefined) body.desc = description;
				if (name !== undefined) body.name = name;

				if (Object.keys(body).length === 0) {
					return {
						content: [
							{
								type: 'text',
								text: 'At least one of description or name must be provided',
							},
						],
						isError: true,
					};
				}

				const response = await fetchWithRetry(
					`https://api.trello.com/1/cards/${cardId}?key=${credentials.apiKey}&token=${credentials.apiToken}`,
					{
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(body),
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
							text: `Error updating card: ${error}`,
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

				const response = await fetchWithRetry(
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
						const response = await fetchWithRetry(
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

				const response = await fetchWithRetry(
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
						const response = await fetchWithRetry(
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

				const response = await fetchWithRetry(url.toString());
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

				const response = await fetchWithRetry(
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
						const response = await fetchWithRetry(
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

	// GET /cards/{id}/attachments - List card attachments
	server.tool(
		'get-card-attachments',
		{
			cardId: z.string().describe('ID of the card to get attachments from'),
		},
		async ({ cardId }) => {
			try {
				if (!credentials.apiKey || !credentials.apiToken) {
					return { content: [{ type: 'text' as const, text: 'Trello API credentials are not configured' }], isError: true };
				}

				const url = new URL(`https://api.trello.com/1/cards/${cardId}/attachments`);
				url.searchParams.append('key', credentials.apiKey);
				url.searchParams.append('token', credentials.apiToken);

				const response = await fetchWithRetry(url.toString());
				const attachments = await response.json();

				// Also fetch comments to map attachments to comments
				const actionsUrl = new URL(`https://api.trello.com/1/cards/${cardId}/actions`);
				actionsUrl.searchParams.append('key', credentials.apiKey);
				actionsUrl.searchParams.append('token', credentials.apiToken);
				actionsUrl.searchParams.append('filter', 'commentCard');

				const actionsResponse = await fetchWithRetry(actionsUrl.toString());
				const comments = await actionsResponse.json();

				// Map attachment URLs mentioned in comments
				const attachmentCommentMap: Record<string, string> = {};
				for (const comment of comments) {
					const text: string = comment.data?.text || '';
					for (const att of attachments) {
						if (text.includes(att.name) || text.includes(att.id)) {
							attachmentCommentMap[att.id] = text;
						}
					}
				}

				const summary = attachments.map((att: any) => ({
					id: att.id,
					name: att.name,
					mimeType: att.mimeType,
					bytes: att.bytes,
					date: att.date,
					isUpload: att.isUpload,
					url: att.url,
					commentContext: attachmentCommentMap[att.id] || null,
				}));

				return { content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }] };
			} catch (error) {
				return { content: [{ type: 'text' as const, text: `Error getting attachments: ${error}` }], isError: true };
			}
		}
	);

	// Download all image attachments from a card to a local folder
	server.tool(
		'download-card-attachments',
		{
			cardId: z.string().describe('ID of the card to download attachments from'),
			savePath: z.string().describe('Local directory path to save attachments to'),
			imagesOnly: z.boolean().optional().describe('Only download image files (default: true)'),
		},
		async ({ cardId, savePath, imagesOnly = true }) => {
			try {
				if (!credentials.apiKey || !credentials.apiToken) {
					return { content: [{ type: 'text' as const, text: 'Trello API credentials are not configured' }], isError: true };
				}

				// Fetch card info
				const cardUrl = new URL(`https://api.trello.com/1/cards/${cardId}`);
				cardUrl.searchParams.append('key', credentials.apiKey);
				cardUrl.searchParams.append('token', credentials.apiToken);
				cardUrl.searchParams.append('fields', 'name,desc,shortUrl');
				const cardResponse = await fetchWithRetry(cardUrl.toString());
				const card = await cardResponse.json();

				// Fetch attachments
				const attUrl = new URL(`https://api.trello.com/1/cards/${cardId}/attachments`);
				attUrl.searchParams.append('key', credentials.apiKey);
				attUrl.searchParams.append('token', credentials.apiToken);
				const attResponse = await fetchWithRetry(attUrl.toString());
				const attachments = await attResponse.json();

				// Fetch comments for context
				const actionsUrl = new URL(`https://api.trello.com/1/cards/${cardId}/actions`);
				actionsUrl.searchParams.append('key', credentials.apiKey);
				actionsUrl.searchParams.append('token', credentials.apiToken);
				actionsUrl.searchParams.append('filter', 'commentCard');
				const actionsResponse = await fetchWithRetry(actionsUrl.toString());
				const comments = await actionsResponse.json();

				// Filter to images if needed
				const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
				const filtered = imagesOnly
					? attachments.filter((a: any) => a.mimeType && IMAGE_MIMES.includes(a.mimeType))
					: attachments;

				if (filtered.length === 0) {
					return { content: [{ type: 'text' as const, text: `No ${imagesOnly ? 'image ' : ''}attachments found on card "${card.name}"` }] };
				}

				// Ensure output directory
				await fs.mkdir(savePath, { recursive: true });

				// Download each attachment
				const manifest: Array<{
					file: string;
					originalName: string;
					mimeType: string;
					bytes: number;
					date: string;
					commentContext: string | null;
				}> = [];

				// OAuth header for Trello file downloads (query params return 401)
				const authHeader = `OAuth oauth_consumer_key="${credentials.apiKey}", oauth_token="${credentials.apiToken}"`;

				for (let i = 0; i < filtered.length; i++) {
					const att = filtered[i];

					const fileResponse = await fetchWithRetry(att.url, {
						headers: { 'Authorization': authHeader },
					});
					const buffer = Buffer.from(await fileResponse.arrayBuffer());

					// Sanitize filename: {index}-{original_name}
					const baseName = att.name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_');
					const fileName = `${String(i + 1).padStart(2, '0')}-${baseName}`;
					const filePath = path.join(savePath, fileName);

					await fs.writeFile(filePath, buffer);

					// Find comment context
					let commentContext: string | null = null;
					for (const comment of comments) {
						const text: string = comment.data?.text || '';
						if (text.includes(att.name) || text.includes(att.id)) {
							commentContext = text;
							break;
						}
					}

					manifest.push({
						file: fileName,
						originalName: att.name,
						mimeType: att.mimeType,
						bytes: buffer.length,
						date: att.date,
						commentContext,
					});
				}

				// Write manifest
				const manifestData = {
					card: { id: cardId, name: card.name, description: card.desc, url: card.shortUrl },
					downloadedAt: new Date().toISOString(),
					files: manifest,
				};
				await fs.writeFile(
					path.join(savePath, '_manifest.json'),
					JSON.stringify(manifestData, null, 2),
					'utf-8'
				);

				return {
					content: [{
						type: 'text' as const,
						text: JSON.stringify({
							savedTo: savePath,
							card: card.name,
							filesDownloaded: manifest.length,
							files: manifest.map(m => ({ file: m.file, mimeType: m.mimeType, bytes: m.bytes, commentContext: m.commentContext })),
						}, null, 2),
					}],
				};
			} catch (error) {
				return { content: [{ type: 'text' as const, text: `Error downloading attachments: ${error}` }], isError: true };
			}
		}
	);
}

 