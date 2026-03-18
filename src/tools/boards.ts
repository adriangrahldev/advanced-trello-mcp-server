import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TrelloCredentials } from '../types/common.js';
import { fetchWithRetry } from '../utils/api.js';

/**
 * Register all Boards API tools
 */
export function registerBoardsTools(server: McpServer, credentials: TrelloCredentials) {
	// GET /members/me/boards - Get all boards with optimized parameters
	server.tool(
		'get-boards',
		{
			fields: z.string().optional().describe('Comma-separated list of fields to include (e.g., "id,name,url"). Default: "id,name,url,closed,starred"'),
			filter: z.string().optional().describe('Filter boards by type: "open", "closed", "starred", "all". Default: "open"'),
			limit: z.number().min(1).max(100).optional().describe('Maximum number of boards to return (1-100). Default: 50'),
			organization: z.boolean().optional().describe('Include organization boards. Default: true'),
			lists: z.string().optional().describe('Include lists: "open", "closed", "all", "none". Default: "none"'),
		},
		async (params) => {
			try {
				// Default parameters to reduce response size
				const fields = params.fields || 'id,name,url,closed,starred';
				const filter = params.filter || 'open';
				const limit = params.limit || 50;
				const organization = params.organization !== false;
				const lists = params.lists || 'none';

				// Build query parameters
				const queryParams = new URLSearchParams({
					key: credentials.apiKey,
					token: credentials.apiToken,
					fields: fields,
					filter: filter,
					lists: lists,
				});

				// Add organization parameter if needed
				if (organization) {
					queryParams.append('organization', 'true');
				}

				const response = await fetchWithRetry(
					`https://api.trello.com/1/members/me/boards?${queryParams}`
				);
				const data = await response.json();

				// Apply client-side limit if needed
				const limitedData = Array.isArray(data) ? data.slice(0, limit) : data;

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								boards: limitedData,
								count: Array.isArray(limitedData) ? limitedData.length : 0,
								parameters_used: {
									fields,
									filter,
									limit,
									organization,
									lists
								},
								note: 'Use fields parameter to customize response size. Available fields: id,name,desc,closed,starred,url,shortUrl,prefs,dateLastActivity,idOrganization'
							}, null, 2),
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
		}
	);

	// TODO: Add more boards tools
	// - get-board: Get detailed board information
	// - update-board: Update board properties
	// - create-board: Create new board
	// - get-board-cards: Get cards from board
	// - get-board-members: Get board members
	// - get-board-labels: Get board labels
	// - add-member-to-board: Add member to board
	// - remove-member-from-board: Remove member from board
} 