import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TrelloCredentials } from '../types/common.js';

/**
 * Register all Boards API tools
 */
export function registerBoardsTools(server: McpServer, credentials: TrelloCredentials) {
	// GET /members/me/boards - Get all boards
	server.tool('get-boards', {}, async () => {
		try {
			const response = await fetch(
				`https://api.trello.com/1/members/me/boards?key=${credentials.apiKey}&token=${credentials.apiToken}`
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