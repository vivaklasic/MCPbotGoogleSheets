import { google } from 'googleapis';
import { McpServer } from '@modelcontextprotocol/sdk/server';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheets = google.sheets({ version: 'v4', auth });
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

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).send('✅ MCP Google Sheets працює');
  }

  if (req.method === 'POST') {
    try {
      const response = await mcp.handle(req.body);
      return res.status(200).json(response);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
