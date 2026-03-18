# 🚀 Advanced Trello MCP Server

> **Enhanced Model Context Protocol Server for Trello integration with Cursor AI**  
> Production-hardened API layer, batch tools, and attachment downloads

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Trello API](https://img.shields.io/badge/Trello%20API-Complete-green.svg)](https://developer.atlassian.com/cloud/trello/rest/)
[![MCP Protocol](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<a href="https://glama.ai/mcp/servers/@adriangrahldev/advanced-trello-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@adriangrahldev/advanced-trello-mcp-server/badge" alt="Advanced Trello Server MCP server" />
</a>

## 📋 Overview

This is an **enhanced version** of the Trello MCP Server that provides comprehensive integration between Trello and Cursor AI (and similar MCP clients). It includes **~35 tools** across boards, lists, cards, labels, and actions, plus a **reliable HTTP layer** suited to heavy or sequential API use.

## ✨ Features

### 🛡️ **Reliability (production-tested)**

All Trello calls (MCP **resources** and **tools**) go through a shared client in `src/utils/api.ts`:

- **HTTPS keep-alive** — reuses TLS connections (helps avoid CloudFront / CDN connection churn on burst traffic)
- **`fetchWithRetry`** — ~60s timeout, exponential backoff with jitter (up to 7 attempts), retries on network errors and 5xx
- **Sliding-window rate limit** — ~80 requests / 10s (mutex-protected)
- **429 handling** — respects `Retry-After` when present

### 🎯 **API coverage (current)**

| Area | Tools | Notes |
|------|-------|--------|
| **Lists** | 10 | Full list lifecycle, bulk card moves |
| **Cards** | 12 | Batch create/move/archive/comments, **attachments** |
| **Labels** | 8 | Including batch add |
| **Actions** | 4 | Get / update / delete action, list reactions |
| **Boards** | 1 | List accessible boards |

### 🔧 **Other**

- **TypeScript** + **Zod** validation on tool inputs
- **Batch operations** — fewer round-trips for agents (`create-cards`, `move-cards`, `archive-cards`, `add-comments`, etc.)
- **Attachment pipeline** — list metadata + optional download to disk (see below)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Trello API Key and Token
- Cursor (or any MCP client)

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
   Add to your `~/.cursor/mcp.json` (paths adjusted for your machine):
   ```json
   {
     "mcpServers": {
       "trello": {
         "command": "node",
         "args": ["/path/to/advanced-trello-mcp-server/build/index.js"],
         "env": {
           "TRELLO_API_KEY": "your_api_key",
           "TRELLO_API_TOKEN": "your_api_token"
         }
       }
     }
   }
   ```

## 🛠️ Available Tools

### 📋 **Lists (10)**

- `get-lists` — Lists on a board
- `create-list` / `update-list` / `archive-list`
- `move-list-to-board`
- `get-list-actions` / `get-list-board` / `get-list-cards`
- `archive-all-cards-in-list` / `move-all-cards-in-list`

### 🎯 **Cards (12)**

- `create-card` — Optional **`due`** and **`start`** (ISO 8601)
- `create-cards` — Batch create; each card may include **`due`** / **`start`**
- `update-card` — Name and/or description
- `move-card` / `move-cards`
- `add-comment` / **`add-comments`** (batch comments on multiple cards)
- `get-tickets-by-list`
- `archive-card` / `archive-cards`
- **`get-card-attachments`** — Metadata + `commentContext` (e.g. screenshots on comments)
- **`download-card-attachments`** — Downloads files to a folder (numbered files + `_manifest.json`). File URLs often require **OAuth-style `Authorization` header** (not query-string key/token); this tool handles that.

### 🏷️ **Labels (8)**

- `create-label` / `create-labels`
- `add-label` / `add-labels`
- `get-label` / `update-label` / `delete-label` / `update-label-field`

### 📊 **Actions (4)**

- `get-action` — With optional display/entities/member params
- `update-action` / `delete-action`
- `get-action-reactions`

### 🏢 **Boards (1)**

- `get-boards`

## ❓ Why is an old Pull Request still “open” on GitHub?

GitHub marks a PR as **Merged** only when you merge **that PR** (green “Merge pull request” button), or when the PR branch is merged in a way GitHub links to the PR.

If you **cherry-picked, copied files, or merged locally** into `main` and **pushed `main`**, the code is on the repo but **the PR stays open** until you:

1. **Close the PR** manually — add a comment such as: *“Landed on `main` via commit &lt;hash&gt; — thanks!”*  
2. Or use **GitHub’s merge** flow next time so the PR closes automatically.

Conflicts on fork-based PRs are normal; resolving on your machine and pushing `main` is fine — just close the PR afterward so contributors know it’s done.

## 📈 Roadmap

Broader Trello API coverage (checklists, members, webhooks, search, etc.) is planned. PRs welcome.

## 🔧 Development

### Project structure

```
advanced-trello-mcp-server/
├── src/
│   ├── index.ts
│   ├── tools/       # boards, lists, cards, labels, actions
│   ├── types/
│   └── utils/       # api.ts — fetchWithRetry, keep-alive, rate limit
├── build/
├── scripts/build.js
├── package.json
└── README.md
```

### Building

```bash
npm run build    # TypeScript + shebang on build/index.js
npm run compile  # tsc only
```

**Cross-platform build** (Windows / macOS / Linux): compiles TS, adds `#!/usr/bin/env node`, sets execute bit on Unix.

## 🤝 Contributing

1. Fork the repository  
2. Branch (`git checkout -b feature/...`)  
3. Commit ([Conventional Commits](https://www.conventionalcommits.org/) encouraged)  
4. Open a Pull Request  

If the maintainer merges your work outside the GitHub PR UI, they may close the PR with a link to the landing commit — that does **not** mean your contribution wasn’t accepted.

## 📚 API documentation

Tools follow the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/). Inputs are validated with Zod.

## 🐛 Troubleshooting

| Issue | What to check |
|-------|----------------|
| Credentials | `TRELLO_API_KEY` + `TRELLO_API_TOKEN`; token scopes (`read` / `write`) |
| Tool not found | Rebuild (`npm run build`), restart MCP client |
| `fetch failed` / timeouts | Retry layer should help; sustained 429 → slow down workflows |
| Attachment download 401 | Use `download-card-attachments` (header auth), not raw URL with `?key=&token=` |

## 📄 License

MIT — see [LICENSE](LICENSE).

## 🙏 Acknowledgments

- Original Trello MCP Server — [yairhaimo/trello-mcp-server](https://github.com/yairhaimo/trello-mcp-server)
- Reliability, batch card/comment tools, and attachment downloads — community contributions (e.g. [Serebrennikovi](https://github.com/Serebrennikovi))
- [Trello API](https://developer.atlassian.com/cloud/trello/rest/) · [MCP](https://modelcontextprotocol.io/) · [Cursor](https://cursor.com/)

---

**Built with ❤️ for the Cursor AI community**
