# Client-Manager MCP Server (Render Edition)

This is a Model Context Protocol (MCP) server for the Client-Manager application. It operates as a standard Express.js web server using SSE (Server-Sent Events) to allow AI assistants (like Claude Desktop) to connect securely over the internet.

## Features
- **Clients**: List, create, update, delete
- **Tasks**: List (by client), create, update, delete
- **Comments**: List, create
- **Security**: Built-in API Key authentication.

---

## 🚀 How to Deploy on Render

1. Create a new **Web Service** on [Render.com](https://render.com).
2. Connect your GitHub repository (the one containing this project).
3. **Configuration**:
   - **Root Directory**: `mcp-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Environment Variables**: Add the following keys in the Render Dashboard:
   - `VITE_SUPABASE_URL`: (Your Supabase URL)
   - `VITE_SUPABASE_KEY`: (Your Supabase Key)
   - `MCP_API_KEY`: Create a secure random password (e.g., `minha-senha-secreta-mcp-2026`).

Render will automatically install the packages and start the Express server on port 10000 (or whichever it assigns).

---

## 💻 Connecting to Claude Desktop

Once deployed, Render will give you a URL like `https://client-manager-mcp.onrender.com`.

To connect Claude Desktop to your live cloud server, add the following to your `claude_desktop_config.json`:

\`\`\`json
{
  "mcpServers": {
    "client-manager-cloud": {
      "command": "curl",
      "args": [
        "-N",
        "-H", "Authorization: Bearer minha-senha-secreta-mcp-2026",
        "https://client-manager-mcp.onrender.com/sse"
      ]
    }
  }
}
\`\`\`

*(Note: Wait, Claude Desktop usually supports SSE natively without `curl`, but if it doesn't support headers via SSE config easily, wait... The official way to configure SSE in Claude Desktop config is actually using the `sse` object instead of `command` and `args`.)*

### Correct Claude Desktop SSE Config
Since Claude Desktop currently primarily supports local commands, the community standard for connecting Claude Desktop to a remote SSE server with headers involves using a bridge tool like `mcp-cli` or a custom proxy script, OR waiting for native SSE config block.
Actually, the `@modelcontextprotocol` ecosystem allows `sse` connections if the client supports it. If Claude Desktop doesn't natively support `sse` URLs in the config yet, you can use the official `npx @modelcontextprotocol/client-cli` or similar bridge.

However, a simpler local bridge in your config to connect to your remote Render server is:

\`\`\`json
{
  "mcpServers": {
    "client-manager-cloud": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/client-cli",
        "sse",
        "--header", "Authorization: Bearer sua-senha-aqui",
        "https://SEU-APP.onrender.com/sse"
      ]
    }
  }
}
\`\`\`
*(This runs a tiny local process that bridges Claude to your Render server securely!)*

---

## Running Locally

To test locally:
\`\`\`sh
cd mcp-server
npm install
npm start
\`\`\`
The server will start on `http://localhost:3001`.
