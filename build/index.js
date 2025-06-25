#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
// Import modular tools
const boards_js_1 = require("./tools/boards.js");
const lists_js_1 = require("./tools/lists.js");
const cards_js_1 = require("./tools/cards.js");
const labels_js_1 = require("./tools/labels.js");
const actions_js_1 = require("./tools/actions.js");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const trelloApiKey = process.env.TRELLO_API_KEY;
const trelloApiToken = process.env.TRELLO_API_TOKEN;
// Enable CORS and JSON parsing
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Create an MCP server
const server = new mcp_js_1.McpServer({
    name: 'Advanced Trello MCP Server',
    version: '2.0.0',
});
// Prepare credentials
const credentials = {
    apiKey: trelloApiKey || '',
    apiToken: trelloApiToken || '',
};
// Define resources (same as before)
server.resource('boards', 'trello://boards', async (uri) => {
    const response = await fetch(`https://api.trello.com/1/members/me/boards?key=${trelloApiKey}&token=${trelloApiToken}`);
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
server.resource('lists', new mcp_js_1.ResourceTemplate('trello://boards/{boardId}/lists', { list: undefined }), async (uri, { boardId }) => {
    const response = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${trelloApiKey}&token=${trelloApiToken}`);
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
server.resource('cards', new mcp_js_1.ResourceTemplate('trello://lists/{listId}/cards', { list: undefined }), async (uri, { listId }) => {
    const response = await fetch(`https://api.trello.com/1/lists/${listId}/cards?key=${trelloApiKey}&token=${trelloApiToken}`);
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
// Register all tools by API group
(0, boards_js_1.registerBoardsTools)(server, credentials);
(0, lists_js_1.registerListsTools)(server, credentials);
(0, cards_js_1.registerCardsTools)(server, credentials);
(0, labels_js_1.registerLabelsTools)(server, credentials);
(0, actions_js_1.registerActionsTools)(server, credentials);
// Connect to stdio transport
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport);
// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Advanced Trello MCP Server running on port ${PORT}`);
    console.log(`🔧 APIs available: Boards, Lists, Cards, Labels, Actions`);
    console.log(`📋 Modular architecture with 44+ tools`);
});
// Export server for testing
exports.default = server;
