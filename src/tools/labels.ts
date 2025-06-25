import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TrelloCredentials, TrelloColorEnum, TrelloColorWithNullEnum } from '../types/common.js';

/**
 * Register all Labels API tools
 * Based on https://developer.atlassian.com/cloud/trello/rest/api-group-labels/
 */
export function registerLabelsTools(server: McpServer, credentials: TrelloCredentials) {
	// POST /labels - Create a single label
	server.tool(
		'create-label',
		{
			boardId: z.string().describe('ID of the board to create the label in'),
			name: z.string().describe('Name of the label'),
			color: TrelloColorEnum.describe('Color of the label'),
		},
		async ({ boardId, name, color }) => {
			try {
				const response = await fetch(
					`https://api.trello.com/1/labels?key=${credentials.apiKey}&token=${credentials.apiToken}`,
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

	// POST /cards/{id}/idLabels - Add label to card
	server.tool(
		'add-label',
		{
			cardId: z.string().describe('ID of the card to add the label to'),
			labelId: z.string().describe('ID of the label to add'),
		},
		async ({ cardId, labelId }) => {
			try {
				const response = await fetch(
					`https://api.trello.com/1/cards/${cardId}/idLabels?key=${credentials.apiKey}&token=${credentials.apiToken}`,
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

	// Batch operations
	server.tool(
		'create-labels',
		{
			labels: z.array(
				z.object({
					boardId: z.string().describe('ID of the board to create the label in'),
					name: z.string().describe('Name of the label'),
					color: TrelloColorEnum.describe('Color of the label'),
				})
			),
		},
		async ({ labels }) => {
			try {
				const results = await Promise.all(
					labels.map(async (label) => {
						const response = await fetch(
							`https://api.trello.com/1/labels?key=${credentials.apiKey}&token=${credentials.apiToken}`,
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
							`https://api.trello.com/1/cards/${item.cardId}/idLabels?key=${credentials.apiKey}&token=${credentials.apiToken}`,
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

	// GET /labels/{id} - Get a Label
	server.tool(
		'get-label',
		{
			labelId: z.string().describe('ID of the label to retrieve'),
			fields: z.string().optional().describe('Comma-separated list of fields to include')
		},
		async ({ labelId, fields }) => {
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

				const url = new URL(`https://api.trello.com/1/labels/${labelId}`);
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
							text: `Error getting label: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// PUT /labels/{id} - Update a Label
	server.tool(
		'update-label',
		{
			labelId: z.string().describe('ID of the label to update'),
			name: z.string().optional().describe('New name for the label'),
			color: TrelloColorWithNullEnum.optional().describe('New color for the label (use "null" to remove color)')
		},
		async ({ labelId, name, color }) => {
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
				if (color !== undefined) updateData.color = color === 'null' ? null : color;

				const response = await fetch(
					`https://api.trello.com/1/labels/${labelId}?key=${credentials.apiKey}&token=${credentials.apiToken}`,
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
							text: `Error updating label: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// DELETE /labels/{id} - Delete a Label
	server.tool(
		'delete-label',
		{
			labelId: z.string().describe('ID of the label to delete')
		},
		async ({ labelId }) => {
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
					`https://api.trello.com/1/labels/${labelId}?key=${credentials.apiKey}&token=${credentials.apiToken}`,
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
							text: `Error deleting label: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);

	// PUT /labels/{id}/{field} - Update a field on a label
	server.tool(
		'update-label-field',
		{
			labelId: z.string().describe('ID of the label to update'),
			field: z.enum(['name', 'color']).describe('Field to update (name or color)'),
			value: z.string().describe('New value for the field')
		},
		async ({ labelId, field, value }) => {
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

				const url = new URL(`https://api.trello.com/1/labels/${labelId}/${field}`);
				url.searchParams.append('key', credentials.apiKey);
				url.searchParams.append('token', credentials.apiToken);
				url.searchParams.append('value', value);

				const response = await fetch(url.toString(), {
					method: 'PUT',
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
							text: `Error updating label field: ${error}`,
						},
					],
					isError: true,
				};
			}
		}
	);
} 