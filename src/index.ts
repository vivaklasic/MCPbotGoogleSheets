import express from "express";
import { google } from "googleapis";
import { McpServer } from "@modelcontextprotocol/sdk/server";

const app = express();
app.use(express.json());

// === Google Sheets Setup ===
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

// === MCP Setup ===
const mcp = new McpServer({ name: "google-sheets" });

mcp.tool("read_sheet", {
  description: "Читает данные из Google Sheets по ID и диапазону",
  input: {
    type: "object",
    properties: {
      spreadsheetId: { type: "string" },
      range: { type: "string" }
    },
    required: ["spreadsheetId", "range"]
  },
  async execute({ spreadsheetId, range }) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return res.data.values ?? [];
  }
});

// === Express endpoint for MCP ===
app.post("/mcp", async (req, res) => {
  try {
    const response = await mcp.handle(req.body);
    res.json(response);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (_, res) => res.send("✅ MCP Google Sheets Server работает"));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 MCP Google Sheets running on port ${port}`);
});
