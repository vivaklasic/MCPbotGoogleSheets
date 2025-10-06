import { createMCPServer } from "@modelcontextprotocol/sdk";
import { google } from "googleapis";

const sheets = google.sheets("v4");

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const mcp = createMCPServer({
  name: "google-sheets-mcp",
  actions: {
    async getSheetData({ spreadsheetId, range }) {
      try {
        const client = await auth.getClient();
        const res = await sheets.spreadsheets.values.get({
          auth: client,
          spreadsheetId,
          range,
        });
        return res.data.values ?? [];
      } catch (e) {
        console.error("Google Sheets error:", e.errors || e.message);
        throw e;
      }
    },
  },
});

mcp.listen();
