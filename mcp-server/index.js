import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";

// Load environment variables from the parent directory's .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function createMCPServer() {
  const server = new Server(
    {
      name: "client-manager-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_clients",
          description: "List all clients",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "create_client",
          description: "Add a new client",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string" },
              emoji: { type: "string", description: "Default is 🏢" },
              status: { type: "string", enum: ["active", "negotiation"], description: "Default is active" },
              since: { type: "string", description: "Date in YYYY-MM-DD format" },
              contact_email: { type: "string" },
              contact_phone: { type: "string" },
              conn_drive: { type: "string" },
              conn_instagram: { type: "string" },
              conn_tiktok: { type: "string" },
              conn_website: { type: "string" },
            },
            required: ["name"],
          },
        },
        {
          name: "update_client",
          description: "Update client information",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "UUID of the client" },
              name: { type: "string" },
              emoji: { type: "string" },
              status: { type: "string", enum: ["active", "negotiation"] },
              since: { type: "string", description: "Date in YYYY-MM-DD format" },
              contact_email: { type: "string" },
              contact_phone: { type: "string" },
              conn_drive: { type: "string" },
              conn_instagram: { type: "string" },
              conn_tiktok: { type: "string" },
              conn_website: { type: "string" },
            },
            required: ["id"],
          },
        },
        {
          name: "delete_client",
          description: "Remove a client",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "UUID of the client" },
            },
            required: ["id"],
          },
        },
        {
          name: "get_tasks",
          description: "List all tasks, optionally filtered by client_id",
          inputSchema: {
            type: "object",
            properties: {
              client_id: { type: "string", description: "UUID of the client" },
            },
          },
        },
        {
          name: "create_task",
          description: "Add a new task to a client",
          inputSchema: {
            type: "object",
            properties: {
              client_id: { type: "string", description: "UUID of the client" },
              title: { type: "string" },
              description: { type: "string" },
              due_date: { type: "string", description: "Date in YYYY-MM-DD format" },
              assignees: { type: "array", items: { type: "string" } },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              status: { type: "string", enum: ["pending", "completed"] },
            },
            required: ["client_id", "title"],
          },
        },
        {
          name: "update_task",
          description: "Update a task",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "UUID of the task" },
              title: { type: "string" },
              description: { type: "string" },
              due_date: { type: "string", description: "Date in YYYY-MM-DD format" },
              assignees: { type: "array", items: { type: "string" } },
              status: { type: "string", enum: ["pending", "completed"] },
              priority: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["id"],
          },
        },
        {
          name: "delete_task",
          description: "Remove a task",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "UUID of the task" },
            },
            required: ["id"],
          },
        },
        {
          name: "get_comments",
          description: "List comments for a task or client",
          inputSchema: {
            type: "object",
            properties: {
              parent_type: { type: "string", enum: ["task", "client"] },
              parent_id: { type: "string", description: "UUID of the parent task or client" },
            },
            required: ["parent_type", "parent_id"],
          },
        },
        {
          name: "create_comment",
          description: "Add a new comment",
          inputSchema: {
            type: "object",
            properties: {
              parent_type: { type: "string", enum: ["task", "client"] },
              parent_id: { type: "string", description: "UUID of the parent" },
              author: { type: "string", description: "Name of the author (e.g., the AI assistant)" },
              body: { type: "string" },
            },
            required: ["parent_type", "parent_id", "author", "body"],
          },
        },
        {
          name: "update_comment",
          description: "Update a comment",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "UUID of the comment" },
              body: { type: "string" },
            },
            required: ["id", "body"],
          },
        },
        {
          name: "delete_comment",
          description: "Remove a comment",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "UUID of the comment" },
            },
            required: ["id"],
          },
        },
      ],
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_clients": {
          const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        case "create_client": {
          const { data, error } = await supabase.from("clients").insert([args]).select();
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }] };
        }

        case "update_client": {
          const { id, ...updateData } = args;
          const { data, error } = await supabase.from("clients").update(updateData).eq("id", id).select();
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }] };
        }

        case "delete_client": {
          const { id } = args;
          const { error } = await supabase.from("clients").delete().eq("id", id);
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: `Client ${id} deleted successfully.` }] };
        }

        case "get_tasks": {
          let query = supabase.from("tasks").select("*, clients(name)");
          if (args && args.client_id) {
            query = query.eq("client_id", args.client_id);
          }
          const { data, error } = await query.order("created_at", { ascending: false });
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        case "create_task": {
          const { data, error } = await supabase.from("tasks").insert([args]).select();
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }] };
        }

        case "update_task": {
          const { id, ...updateData } = args;
          const { data, error } = await supabase.from("tasks").update(updateData).eq("id", id).select();
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }] };
        }

        case "delete_task": {
          const { id } = args;
          const { error } = await supabase.from("tasks").delete().eq("id", id);
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: `Task ${id} deleted successfully.` }] };
        }

        case "get_comments": {
          const { parent_type, parent_id } = args;
          const { data, error } = await supabase
            .from("comments")
            .select("*")
            .eq("parent_type", parent_type)
            .eq("parent_id", parent_id)
            .order("created_at", { ascending: true });
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        case "create_comment": {
          const { data, error } = await supabase.from("comments").insert([args]).select();
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }] };
        }

        case "update_comment": {
          const { id, body } = args;
          const { data, error } = await supabase.from("comments").update({ body }).eq("id", id).select();
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }] };
        }

        case "delete_comment": {
          const { id } = args;
          const { error } = await supabase.from("comments").delete().eq("id", id);
          if (error) throw new Error(error.message);
          return { content: [{ type: "text", text: `Comment ${id} deleted successfully.` }] };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  return server;
}

const app = express();
app.use(cors());

// Remove local apiKey constant since we use DB now

// Authentication Middleware
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Missing Bearer token." });
  }

  const token = authHeader.split(" ")[1];

  // Verify against Supabase
  const { data, error } = await supabase
    .from("mcp_api_keys")
    .select("id, name")
    .eq("key_value", token)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: "Unauthorized. Invalid API Key." });
  }

  // Update last_used_at without blocking the request
  supabase.from("mcp_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then();

  req.mcpClientName = data.name;
  next();
});

const transports = new Map();

// SSE Endpoint: Establishes a persistent connection
app.get("/sse", async (req, res) => {
  const sessionId = Date.now().toString() + Math.random().toString(36).substring(7);
  
  // Create a new SSE Transport for this session
  const transport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, res);
  transports.set(sessionId, transport);

  // Create a new server instance for this client connection
  const server = createMCPServer();
  await server.connect(transport);

  // Clean up when the connection closes
  req.on("close", () => {
    transports.delete(sessionId);
  });
});

// Messages Endpoint: Receives tool invocation requests
app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);

  if (!transport) {
    return res.status(404).json({ error: "Session not found" });
  }

  await transport.handlePostMessage(req, res);
});

// Start the server based on mode
const isStdio = process.argv.includes('--stdio');

if (isStdio) {
  import("@modelcontextprotocol/sdk/server/stdio.js").then(async ({ StdioServerTransport }) => {
    const transport = new StdioServerTransport();
    const server = createMCPServer();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
  });
} else {
  // Start the Express server
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`MCP Server running on HTTP port ${PORT}`);
    console.log(`SSE Endpoint: http://localhost:${PORT}/sse`);
    console.log(`Messages Endpoint: http://localhost:${PORT}/messages`);
    
    console.log("🔒 Authentication is ENABLED via Supabase mcp_api_keys table.");
  });
}
