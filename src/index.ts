import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { z } from 'zod';

dotenv.config();

const app = express();
const trelloApiKey = process.env.TRELLO_API_KEY;
const trelloApiToken = process.env.TRELLO_API_TOKEN;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Create an MCP server
const server = new McpServer({
	name: 'Trello MCP Server',
	version: '1.0.0',
});

// Define resources
server.resource('boards', 'trello://boards', async (uri) => {
	const response = await fetch(
		`https://api.trello.com/1/members/me/boards?key=${trelloApiKey}&token=${trelloApiToken}`
	);
	const data = await response.json();
	return {
		contents: [
			{
				uri: uri.href,
				text: JSON.stringify(data),
			},
		],
	};
});

server.resource(
	'lists',
	new ResourceTemplate('trello://boards/{boardId}/lists', { list: undefined }),
	async (uri, { boardId }) => {
		const response = await fetch(
			`https://api.trello.com/1/boards/${boardId}/lists?key=${trelloApiKey}&token=${trelloApiToken}`
		);
		const data = await response.json();
		return {
			contents: [
				{
					uri: uri.href,
					text: JSON.stringify(data),
				},
			],
		};
	}
);

server.resource(
	'cards',
	new ResourceTemplate('trello://lists/{listId}/cards', { list: undefined }),
	async (uri, { listId }) => {
		const response = await fetch(
			`https://api.trello.com/1/lists/${listId}/cards?key=${trelloApiKey}&token=${trelloApiToken}`
		);
		const data = await response.json();
		return {
			contents: [
				{
					uri: uri.href,
					text: JSON.stringify(data),
				},
			],
		};
	}
);

// Define tools
server.tool(
	'create-card',
	{
		name: z.string(),
		description: z.string().optional(),
		listId: z.string(),
	},
	async ({ name, description, listId }) => {
		try {
			const response = await fetch(
				`https://api.trello.com/1/cards?key=${trelloApiKey}&token=${trelloApiToken}`,
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

server.tool('get-boards', {}, async () => {
	try {
		const response = await fetch(
			`https://api.trello.com/1/members/me/boards?key=${trelloApiKey}&token=${trelloApiToken}`
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
					text: `Error getting boards: ${error}`,
				},
			],
			isError: true,
		};
	}
});

server.tool(
	'get-lists',
	{
		boardId: z.string().describe('ID of the Trello board to get lists from'),
	},
	async ({ boardId }) => {
		try {
			const response = await fetch(
				`https://api.trello.com/1/boards/${boardId}/lists?key=${trelloApiKey}&token=${trelloApiToken}`
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

server.tool(
	'create-list',
	{
		boardId: z.string().describe('ID of the board to create the list in'),
		name: z.string().describe('Name of the list'),
		position: z.string().optional().describe('Position of the list (e.g. "top", "bottom", or a number)'),
	},
	async ({ boardId, name, position = 'bottom' }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/lists?key=${trelloApiKey}&token=${trelloApiToken}`,
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
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/lists/${listId}?key=${trelloApiKey}&token=${trelloApiToken}`,
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

server.tool(
	'archive-list',
	{
		listId: z.string().describe('ID of the list to archive or unarchive'),
		archived: z.boolean().describe('Whether to archive (true) or unarchive (false) the list'),
	},
	async ({ listId, archived }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/lists/${listId}/closed?key=${trelloApiKey}&token=${trelloApiToken}`,
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

server.tool(
	'move-list-to-board',
	{
		listId: z.string().describe('ID of the list to move'),
		boardId: z.string().describe('ID of the destination board'),
	},
	async ({ listId, boardId }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/lists/${listId}/idBoard?key=${trelloApiKey}&token=${trelloApiToken}`,
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

server.tool(
	'get-list-actions',
	{
		listId: z.string().describe('ID of the list to get actions for'),
		filter: z.string().optional().describe('Filter for action types'),
	},
	async ({ listId, filter }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
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

server.tool(
	'get-list-board',
	{
		listId: z.string().describe('ID of the list to get board for'),
		fields: z.string().optional().describe('Comma-separated list of board fields to include'),
	},
	async ({ listId, fields }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
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

server.tool(
	'get-list-cards',
	{
		listId: z.string().describe('ID of the list to get cards from'),
		fields: z.string().optional().describe('Comma-separated list of card fields to include'),
		filter: z.string().optional().describe('Filter for card types (e.g., "open", "closed", "all")'),
	},
	async ({ listId, fields, filter }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
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

server.tool(
	'archive-all-cards-in-list',
	{
		listId: z.string().describe('ID of the list to archive all cards in'),
	},
	async ({ listId }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/lists/${listId}/archiveAllCards?key=${trelloApiKey}&token=${trelloApiToken}`,
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

server.tool(
	'move-all-cards-in-list',
	{
		listId: z.string().describe('ID of the source list'),
		destinationBoardId: z.string().describe('ID of the destination board'),
		destinationListId: z.string().describe('ID of the destination list'),
	},
	async ({ listId, destinationBoardId, destinationListId }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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

			const url = new URL(`https://api.trello.com/1/lists/${listId}/moveAllCards`);
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
			url.searchParams.append('idBoard', destinationBoardId);
			url.searchParams.append('idList', destinationListId);

			const response = await fetch(url.toString(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			});
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

server.tool(
	'create-cards',
	{
		cards: z.array(
			z.object({
				name: z.string(),
				description: z.string().optional(),
				listId: z.string(),
			})
		),
	},
	async ({ cards }) => {
		try {
			const results = await Promise.all(
				cards.map(async (card) => {
					const response = await fetch(
						`https://api.trello.com/1/cards?key=${trelloApiKey}&token=${trelloApiToken}`,
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

server.tool(
	'move-card',
	{
		cardId: z.string().describe('ID of the card to move'),
		listId: z.string().describe('ID of the destination list'),
		position: z.string().optional().describe('Position in the list (e.g. "top", "bottom")'),
	},
	async ({ cardId, listId, position = 'bottom' }) => {
		try {
			const response = await fetch(
				`https://api.trello.com/1/cards/${cardId}?key=${trelloApiKey}&token=${trelloApiToken}`,
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

server.tool(
	'add-comment',
	{
		cardId: z.string().describe('ID of the card to comment on'),
		text: z.string().describe('Comment text'),
	},
	async ({ cardId, text }) => {
		try {
			const response = await fetch(
				`https://api.trello.com/1/cards/${cardId}/actions/comments?key=${trelloApiKey}&token=${trelloApiToken}`,
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

server.tool(
	'create-label',
	{
		boardId: z.string().describe('ID of the board to create the label in'),
		name: z.string().describe('Name of the label'),
		color: z
			.enum(['yellow', 'purple', 'blue', 'red', 'green', 'orange', 'black', 'sky', 'pink', 'lime'])
			.describe('Color of the label'),
	},
	async ({ boardId, name, color }) => {
		try {
			const response = await fetch(
				`https://api.trello.com/1/labels?key=${trelloApiKey}&token=${trelloApiToken}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						name,
						color,
						idBoard: boardId,
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
						text: `Error creating label: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

server.tool(
	'add-label',
	{
		cardId: z.string().describe('ID of the card to add the label to'),
		labelId: z.string().describe('ID of the label to add'),
	},
	async ({ cardId, labelId }) => {
		try {
			const response = await fetch(
				`https://api.trello.com/1/cards/${cardId}/idLabels?key=${trelloApiKey}&token=${trelloApiToken}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						value: labelId,
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
						text: `Error adding label to card: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

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
			const results = await Promise.all(
				cards.map(async (card) => {
					const response = await fetch(
						`https://api.trello.com/1/cards/${card.cardId}?key=${trelloApiKey}&token=${trelloApiToken}`,
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
			const results = await Promise.all(
				comments.map(async (comment) => {
					const response = await fetch(
						`https://api.trello.com/1/cards/${comment.cardId}/actions/comments?key=${trelloApiKey}&token=${trelloApiToken}`,
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

server.tool(
	'create-labels',
	{
		labels: z.array(
			z.object({
				boardId: z.string().describe('ID of the board to create the label in'),
				name: z.string().describe('Name of the label'),
				color: z
					.enum([
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
					])
					.describe('Color of the label'),
			})
		),
	},
	async ({ labels }) => {
		try {
			const results = await Promise.all(
				labels.map(async (label) => {
					const response = await fetch(
						`https://api.trello.com/1/labels?key=${trelloApiKey}&token=${trelloApiToken}`,
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								name: label.name,
								color: label.color,
								idBoard: label.boardId,
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
						text: `Error creating labels: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

server.tool(
	'add-labels',
	{
		items: z.array(
			z.object({
				cardId: z.string().describe('ID of the card to add the label to'),
				labelId: z.string().describe('ID of the label to add'),
			})
		),
	},
	async ({ items }) => {
		try {
			const results = await Promise.all(
				items.map(async (item) => {
					const response = await fetch(
						`https://api.trello.com/1/cards/${item.cardId}/idLabels?key=${trelloApiKey}&token=${trelloApiToken}`,
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								value: item.labelId,
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
						text: `Error adding labels to cards: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

server.tool(
	'get-tickets-by-list',
	{
		listId: z.string().describe('ID of the list to get tickets from'),
		limit: z.number().optional().describe('Maximum number of cards to return'),
	},
	async ({ listId, limit }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
			if (limit) {
				url.searchParams.append('limit', limit.toString());
			}

			const response = await fetch(url.toString());
			const data = await response.json();

			if (!Array.isArray(data)) {
				return {
					content: [
						{
							type: 'text',
							text: 'Failed to get tickets from list',
						},
					],
					isError: true,
				};
			}

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
						text: `Error getting tickets from list: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

server.tool(
	'archive-card',
	{
		cardId: z.string().describe('ID of the card to archive'),
	},
	async ({ cardId }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/cards/${cardId}?key=${trelloApiKey}&token=${trelloApiToken}`,
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

server.tool(
	'archive-cards',
	{
		cardIds: z.array(z.string()).describe('IDs of the cards to archive'),
	},
	async ({ cardIds }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
						`https://api.trello.com/1/cards/${cardId}?key=${trelloApiKey}&token=${trelloApiToken}`,
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

// ==========================================
// ACTIONS API - Complete Implementation
// Based on https://developer.atlassian.com/cloud/trello/rest/api-group-actions/
// ==========================================

// GET /actions/{id} - Get an Action
server.tool(
	'get-action',
	{
		actionId: z.string().describe('ID of the action to retrieve'),
		display: z.boolean().optional().describe('Include display information'),
		entities: z.boolean().optional().describe('Include entity information'),
		fields: z.string().optional().describe('Comma-separated list of fields to include'),
		member: z.boolean().optional().describe('Include member information'),
		memberFields: z.string().optional().describe('Comma-separated list of member fields'),
		memberCreator: z.boolean().optional().describe('Include member creator information'),
		memberCreatorFields: z.string().optional().describe('Comma-separated list of member creator fields')
	},
	async ({ actionId, display, entities, fields, member, memberFields, memberCreator, memberCreatorFields }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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

			const url = new URL(`https://api.trello.com/1/actions/${actionId}`);
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
			
			if (display) url.searchParams.append('display', display.toString());
			if (entities) url.searchParams.append('entities', entities.toString());
			if (fields) url.searchParams.append('fields', fields);
			if (member) url.searchParams.append('member', member.toString());
			if (memberFields) url.searchParams.append('member_fields', memberFields);
			if (memberCreator) url.searchParams.append('memberCreator', memberCreator.toString());
			if (memberCreatorFields) url.searchParams.append('memberCreator_fields', memberCreatorFields);

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
						text: `Error getting action: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// PUT /actions/{id} - Update an Action (Only comment actions can be updated)
server.tool(
	'update-action',
	{
		actionId: z.string().describe('ID of the action to update'),
		text: z.string().describe('New text content for the comment action')
	},
	async ({ actionId, text }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/actions/${actionId}?key=${trelloApiKey}&token=${trelloApiToken}`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ text }),
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
						text: `Error updating action: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// DELETE /actions/{id} - Delete an Action (Only comment actions can be deleted)
server.tool(
	'delete-action',
	{
		actionId: z.string().describe('ID of the action to delete')
	},
	async ({ actionId }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/actions/${actionId}?key=${trelloApiKey}&token=${trelloApiToken}`,
				{
					method: 'DELETE',
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
						text: `Error deleting action: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// GET /actions/{id}/{field} - Get a specific field on an Action
server.tool(
	'get-action-field',
	{
		actionId: z.string().describe('ID of the action'),
		field: z.enum(['id', 'idMemberCreator', 'data', 'type', 'date', 'limits', 'display', 'memberCreator'])
			.describe('Specific field to retrieve from the action')
	},
	async ({ actionId, field }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/actions/${actionId}/${field}?key=${trelloApiKey}&token=${trelloApiToken}`
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
						text: `Error getting action field: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// GET /actions/{id}/board - Get the Board for an Action
server.tool(
	'get-action-board',
	{
		actionId: z.string().describe('ID of the action'),
		fields: z.string().optional().describe('Comma-separated list of board fields to include')
	},
	async ({ actionId, fields }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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

			const url = new URL(`https://api.trello.com/1/actions/${actionId}/board`);
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
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
						text: `Error getting action board: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// GET /actions/{id}/card - Get the Card for an Action
server.tool(
	'get-action-card',
	{
		actionId: z.string().describe('ID of the action'),
		fields: z.string().optional().describe('Comma-separated list of card fields to include')
	},
	async ({ actionId, fields }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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

			const url = new URL(`https://api.trello.com/1/actions/${actionId}/card`);
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
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
						text: `Error getting action card: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// GET /actions/{id}/list - Get the List for an Action
server.tool(
	'get-action-list',
	{
		actionId: z.string().describe('ID of the action'),
		fields: z.string().optional().describe('Comma-separated list of list fields to include')
	},
	async ({ actionId, fields }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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

			const url = new URL(`https://api.trello.com/1/actions/${actionId}/list`);
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
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
						text: `Error getting action list: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// GET /actions/{id}/member - Get the Member of an Action
server.tool(
	'get-action-member',
	{
		actionId: z.string().describe('ID of the action'),
		fields: z.string().optional().describe('Comma-separated list of member fields to include')
	},
	async ({ actionId, fields }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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

			const url = new URL(`https://api.trello.com/1/actions/${actionId}/member`);
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
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
						text: `Error getting action member: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// GET /actions/{id}/memberCreator - Get the Member Creator of an Action
server.tool(
	'get-action-member-creator',
	{
		actionId: z.string().describe('ID of the action'),
		fields: z.string().optional().describe('Comma-separated list of member fields to include')
	},
	async ({ actionId, fields }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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

			const url = new URL(`https://api.trello.com/1/actions/${actionId}/memberCreator`);
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
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
						text: `Error getting action member creator: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// GET /actions/{id}/organization - Get the Organization of an Action
server.tool(
	'get-action-organization',
	{
		actionId: z.string().describe('ID of the action'),
		fields: z.string().optional().describe('Comma-separated list of organization fields to include')
	},
	async ({ actionId, fields }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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

			const url = new URL(`https://api.trello.com/1/actions/${actionId}/organization`);
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
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
						text: `Error getting action organization: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// PUT /actions/{id}/text - Update a Comment Action
server.tool(
	'update-comment-action',
	{
		actionId: z.string().describe('ID of the comment action to update'),
		value: z.string().describe('New text content for the comment')
	},
	async ({ actionId, value }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/actions/${actionId}/text?key=${trelloApiKey}&token=${trelloApiToken}&value=${encodeURIComponent(value)}`,
				{
					method: 'PUT',
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
						text: `Error updating comment action: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// GET /actions/{idAction}/reactions - Get Action's Reactions
server.tool(
	'get-action-reactions',
	{
		actionId: z.string().describe('ID of the action'),
		member: z.boolean().optional().describe('Include member information for reactions'),
		emoji: z.boolean().optional().describe('Include emoji information for reactions')
	},
	async ({ actionId, member, emoji }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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

			const url = new URL(`https://api.trello.com/1/actions/${actionId}/reactions`);
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
			if (member) url.searchParams.append('member', member.toString());
			if (emoji) url.searchParams.append('emoji', emoji.toString());

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
						text: `Error getting action reactions: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// POST /actions/{idAction}/reactions - Create Reaction for Action
server.tool(
	'create-action-reaction',
	{
		actionId: z.string().describe('ID of the action to react to'),
		shortName: z.string().optional().describe('Short name of the emoji (e.g., "thumbsup")'),
		skinVariation: z.string().optional().describe('Skin tone variation of the emoji'),
		native: z.string().optional().describe('Native emoji character'),
		unified: z.string().optional().describe('Unified emoji code')
	},
	async ({ actionId, shortName, skinVariation, native, unified }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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

			const reactionData: any = {};
			if (shortName) reactionData.shortName = shortName;
			if (skinVariation) reactionData.skinVariation = skinVariation;
			if (native) reactionData.native = native;
			if (unified) reactionData.unified = unified;

			const response = await fetch(
				`https://api.trello.com/1/actions/${actionId}/reactions?key=${trelloApiKey}&token=${trelloApiToken}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(reactionData),
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
						text: `Error creating action reaction: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// GET /actions/{idAction}/reactions/{id} - Get Action's Reaction
server.tool(
	'get-action-reaction',
	{
		actionId: z.string().describe('ID of the action'),
		reactionId: z.string().describe('ID of the reaction'),
		member: z.boolean().optional().describe('Include member information'),
		emoji: z.boolean().optional().describe('Include emoji information')
	},
	async ({ actionId, reactionId, member, emoji }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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

			const url = new URL(`https://api.trello.com/1/actions/${actionId}/reactions/${reactionId}`);
			url.searchParams.append('key', trelloApiKey);
			url.searchParams.append('token', trelloApiToken);
			if (member) url.searchParams.append('member', member.toString());
			if (emoji) url.searchParams.append('emoji', emoji.toString());

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
						text: `Error getting action reaction: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// DELETE /actions/{idAction}/reactions/{id} - Delete Action's Reaction
server.tool(
	'delete-action-reaction',
	{
		actionId: z.string().describe('ID of the action'),
		reactionId: z.string().describe('ID of the reaction to delete')
	},
	async ({ actionId, reactionId }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/actions/${actionId}/reactions/${reactionId}?key=${trelloApiKey}&token=${trelloApiToken}`,
				{
					method: 'DELETE',
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
						text: `Error deleting action reaction: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// GET /actions/{idAction}/reactionsSummary - List Action's summary of Reactions
server.tool(
	'get-action-reactions-summary',
	{
		actionId: z.string().describe('ID of the action')
	},
	async ({ actionId }) => {
		try {
			if (!trelloApiKey || !trelloApiToken) {
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
				`https://api.trello.com/1/actions/${actionId}/reactionsSummary?key=${trelloApiKey}&token=${trelloApiToken}`
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
						text: `Error getting action reactions summary: ${error}`,
					},
				],
				isError: true,
			};
		}
	}
);

// ==========================================
// END OF ACTIONS API IMPLEMENTATION
// ==========================================

(async () => {
	const transport = new StdioServerTransport();
	await server.connect(transport);
})();
