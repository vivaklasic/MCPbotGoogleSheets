import express from "express";
import { google } from "googleapis";
import { McpServer } from "@modelcontextprotocol/sdk/server";

const app = express();
app.use(express.json());

// === Google Sheets Setup ===
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

const sheets = google.sheets({ version: "v4", auth });

// === MCP Setup ===
const mcp = new McpServer({ name: "google-sheets" });

mcp.tool("read_sheet", {
  description: "Читає дані з Google Sheets по ID та діапазону",
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

// === Express endpoints ===
app.post("/mcp", async (req, res) => {
  try {
    const response = await mcp.handle(req.body);
    res.json(response);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (_, res) => res.send("✅ MCP Google Sheets Server працює"));

app.get("/health", (_, res) => res.json({ status: "ok" }));

// Весь попередній код...

// Експорт для Vercel
export default app;

// Локальний запуск
if (process.env.VERCEL !== '1') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}
