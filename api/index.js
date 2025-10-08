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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ✅ Проверка запроса
  const path = req.url.split('?')[0];

  // === 1. Проверка основного endpoint для таблицы ===
  if (path.endsWith('/api')) {
    if (req.method === 'GET') {
      return res.status(200).send('✅ MCP Google Sheets працює');
    }

    if (req.method === 'POST') {
      try {
        const { spreadsheetId, range } = req.body;
        if (!spreadsheetId || !range) {
          return res.status(400).json({ error: 'spreadsheetId і range обов\'язкові' });
        }

        const result = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        return res.status(200).json({
          success: true,
          data: result.data.values || []
        });

      } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: err.message });
      }
    }
  }

  // === 2. Новый endpoint show_image ===
  if (path.endsWith('/api/show_image') && req.method === 'POST') {
    const { url, caption } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL обязательный' });
    }

    // возвращаем HTML или JSON для показа картинки
    return res.status(200).json({
      success: true,
      html: `<figure style="text-align:center">
               <img src="${url}" alt="image" style="max-width:80%; border-radius:12px; box-shadow:0 0 10px rgba(0,0,0,0.2)" />
               ${caption ? `<figcaption>${caption}</figcaption>` : ''}
             </figure>`
    });
  }

  // === 3. Если ничего не совпало ===
  return res.status(404).json({ error: 'Endpoint not found' });
}
