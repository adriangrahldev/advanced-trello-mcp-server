import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';

// Import modular tools
import { registerBoardsTools } from './tools/boards.js';
import { registerListsTools } from './tools/lists.js';
import { registerCardsTools } from './tools/cards.js';
import { registerLabelsTools } from './tools/labels.js';
import { registerActionsTools } from './tools/actions.js';

// Import types
import { TrelloCredentials } from './types/common.js';
import { fetchWithRetry } from './utils/api.js';

// Load environment variables
dotenv.config();

const trelloApiKey = process.env.TRELLO_API_KEY;
const trelloApiToken = process.env.TRELLO_API_TOKEN;

// Create an MCP server
const server = new McpServer({
	name: 'Advanced Trello MCP Server',
	version: '2.0.0',
});

// Prepare credentials
const credentials: TrelloCredentials = {
	apiKey: trelloApiKey || '',
	apiToken: trelloApiToken || '',
};

// Define resources (same as before)
server.resource('boards', 'trello://boards', async (uri) => {
	const response = await fetchWithRetry(
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
		const response = await fetchWithRetry(
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
		const response = await fetchWithRetry(
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

// Register all tools by API group
registerBoardsTools(server, credentials);
registerListsTools(server, credentials);
registerCardsTools(server, credentials);
registerLabelsTools(server, credentials);
registerActionsTools(server, credentials);

// Connect to stdio transport
const transport = new StdioServerTransport();
server.connect(transport);

// Export server for testing
export default server; 