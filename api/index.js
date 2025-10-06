import express from 'express';
import { google } from 'googleapis';
import { McpServer } from '@modelcontextprotocol/sdk/server';

const app = express();
app.use(express.json());

// Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheets = google.sheets({ version: 'v4', auth });

// MCP Server
const mcp = new McpServer({ name: 'google-sheets' });

mcp.tool('read_sheet', {
  description: 'Читає дані з Google Sheets',
  input: {
    type: 'object',
    properties: {
      spreadsheetId: { type: 'string' },
      range: { type: 'string' }
    },
    required: ['spreadsheetId', 'range']
  },
  async execute({ spreadsheetId, range }) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return res.data.values || [];
  }
});

app.get('/', (req, res) => {
  res.send('✅ MCP Google Sheets працює');
});

app.post('/mcp', async (req, res) => {
  try {
    const response = await mcp.handle(req.body);
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
