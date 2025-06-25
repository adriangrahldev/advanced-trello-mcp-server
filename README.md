# 🚀 Advanced Trello MCP Server

> **Enhanced Model Context Protocol Server for Trello integration with Cursor AI**  
> Complete API coverage with 40+ tools and enterprise-grade features

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Trello API](https://img.shields.io/badge/Trello%20API-Complete-green.svg)](https://developer.atlassian.com/cloud/trello/rest/)
[![MCP Protocol](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Overview

This is an **enhanced version** of the Trello MCP Server that provides comprehensive integration between Trello and Cursor AI. Originally supporting 15 basic tools, this version has been expanded to **44+ tools** covering multiple Trello API categories with enterprise-grade functionality.

## ✨ Features

### 🎯 **Complete API Coverage**
- **Actions API**: 16 tools (Complete audit trail, reactions, comments)
- **Lists API**: 9 tools (Complete list management)
- **Cards API**: 8 tools (Enhanced card operations)
- **Labels API**: 8 tools (Complete label management) ✅
- **Boards API**: 1 tool (Basic board access)

### 🔧 **Enterprise Features**
- **TypeScript Implementation** with strict typing
- **Zod Validation** for all inputs and outputs
- **Batch Operations** for bulk actions
- **Error Handling** with detailed error messages
- **Rate Limiting Ready** architecture
- **Extensible Design** for future API additions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Trello API Key and Token
- Cursor AI with MCP support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/adriangrahldev/advanced-trello-mcp-server.git
   cd advanced-trello-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Configure environment variables**
   ```bash
   export TRELLO_API_KEY="your_api_key"
   export TRELLO_API_TOKEN="your_api_token"
   ```

5. **Configure Cursor MCP**
   Add to your `~/.cursor/mcp.json`:
   ```json
   {
     "servers": {
       "trello": {
         "command": "/path/to/advanced-trello-mcp-server/build/index.js",
         "env": {
           "TRELLO_API_KEY": "your_api_key",
           "TRELLO_API_TOKEN": "your_api_token"
         }
       }
     }
   }
   ```

## 🛠️ Available Tools

### 📋 **Lists Management (9 tools)**
- `get-lists` - Get all lists from a board
- `create-list` - Create new list
- `update-list` - Update list properties
- `archive-list` - Archive/unarchive lists
- `move-list-to-board` - Move lists between boards
- `get-list-actions` - Get list action history
- `get-list-board` - Get board information from list
- `get-list-cards` - Get cards from list with filtering
- `archive-all-cards-in-list` - Archive all cards in list
- `move-all-cards-in-list` - Move all cards between lists

### 🎯 **Cards Management (8 tools)**
- `create-card` - Create single card
- `create-cards` - Create multiple cards (batch)
- `move-card` - Move card between lists
- `move-cards` - Move multiple cards (batch)
- `archive-card` - Archive single card
- `archive-cards` - Archive multiple cards (batch)
- `get-tickets-by-list` - Get cards from specific list
- `add-comment` - Add comment to card

### 🏷️ **Labels Management (8 tools)** ✅ **COMPLETE**
- `create-label` - Create single label
- `create-labels` - Create multiple labels (batch)
- `add-label` - Add label to card
- `add-labels` - Add labels to multiple cards (batch)
- `get-label` - Get detailed label information
- `update-label` - Update label name and color
- `delete-label` - Delete label by ID
- `update-label-field` - Update specific label field

### 📊 **Actions & Audit (16 tools)**
- `get-action` - Get detailed action information
- `update-action` - Update action (comments)
- `delete-action` - Delete action (comments only)
- `get-action-field` - Get specific action field
- `get-action-board` - Get board from action
- `get-action-card` - Get card from action
- `get-action-list` - Get list from action
- `get-action-member` - Get member from action
- `get-action-member-creator` - Get action creator
- `get-action-organization` - Get organization from action
- `update-comment-action` - Update comment text
- `get-action-reactions` - Get action reactions
- `create-action-reaction` - Add reaction to action
- `get-action-reaction` - Get specific reaction
- `delete-action-reaction` - Remove reaction
- `get-action-reactions-summary` - Get reactions summary

### 🏢 **Boards Management (1 tool)**
- `get-boards` - Get all accessible boards

## 📈 Roadmap

This project follows a strategic 6-phase expansion plan to achieve **100% Trello API coverage**:

### **Phase 1: Foundation** (In Progress - 1/3 Complete)
- ✅ Complete Lists API (9 tools)
- ✅ Complete Actions API (16 tools)
- ✅ Complete Labels API (8 tools) **DONE!**
- 🔄 Enhanced Cards API (15 more tools needed)
- 🔄 Enhanced Boards API (8 more tools needed)

### **Phase 2: Productivity** (Planned)
- Checklists API (12 tools)
- Search API (3 tools)
- Emoji API (2 tools)

### **Phase 3: Collaboration** (Planned)
- Members API (20 tools)
- Organizations API (15 tools)

### **Phase 4: Automation** (Planned)
- Batch API (3 tools)
- CustomFields API (12 tools)
- Webhooks API (8 tools)

### **Phase 5: Advanced Management** (Planned)
- Notifications API (10 tools)
- Plugins API (8 tools)
- Tokens API (6 tools)

### **Phase 6: Enterprise** (Planned)
- Enterprises API (12 tools)
- Applications API (4 tools)

**Target: 182 total tools** (currently at 44)

## 🔧 Development

### Project Structure
```
advanced-trello-mcp-server/
├── src/
│   └── index.ts          # Main MCP server implementation
├── build/
│   └── index.js          # Compiled JavaScript (executable)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Building
```bash
npm run build
```

### Development Workflow
1. Make changes in `src/index.ts`
2. Run `npm run build` to compile
3. Test with Cursor AI
4. Commit changes with conventional commits

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## 📚 API Documentation

This server implements tools based on the official [Trello REST API documentation](https://developer.atlassian.com/cloud/trello/rest/). Each tool includes:

- **Zod schema validation** for type safety
- **Comprehensive error handling**
- **Optional parameters** support
- **Batch operations** where applicable
- **Detailed JSDoc comments**

## 🐛 Troubleshooting

### Common Issues

**1. "Trello API credentials are not configured"**
- Ensure `TRELLO_API_KEY` and `TRELLO_API_TOKEN` are set
- Verify the token has appropriate scopes (`read` minimum, `write` for modifications)

**2. "Tool not found" errors**
- Restart Cursor AI to refresh MCP server
- Verify the build was successful (`npm run build`)
- Check MCP configuration in `~/.cursor/mcp.json`

**3. Permission errors**
- Verify your Trello token has access to the boards/cards you're trying to modify
- Some operations require `write` scope, not just `read`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original Trello MCP Server by [yairhaimo](https://github.com/yairhaimo/trello-mcp-server)
- [Trello API Documentation](https://developer.atlassian.com/cloud/trello/rest/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cursor AI](https://cursor.sh/)

## 📊 Stats

- **Total Tools**: 44 (vs 15 original)
- **API Coverage**: ~40% (target: 100%)
- **Lines of Code**: 2,500+ TypeScript
- **Type Safety**: 100% with Zod validation
- **Documentation**: Comprehensive inline docs

---

**Built with ❤️ for the Cursor AI community** 