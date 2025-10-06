import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheets = google.sheets({ version: 'v4', auth });

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).send('✅ MCP Google Sheets працює');
  }

  if (req.method === 'POST') {
    try {
      const { spreadsheetId, range } = req.body;
      
      if (!spreadsheetId || !range) {
        return res.status(400).json({ 
          error: 'spreadsheetId і range обов\'язкові' 
        });
      }

      const result = await sheets.spreadsheets.values.get({ 
        spreadsheetId, 
        range 
      });

      return res.status(200).json({
        success: true,
        data: result.data.values || []
      });

    } catch (err) {
      console.error('Error:', err);
      return res.status(500).json({ 
        error: err.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
