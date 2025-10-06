import { google } from "googleapis";

const sheets = google.sheets("v4");

export default async function handler(req, res) {
  // Разрешаем только POST-запросы
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { spreadsheetId, range } = req.body;
  if (!spreadsheetId || !range) {
    return res.status(400).json({ error: "Missing spreadsheetId or range" });
  }

  try {
    // Настройка авторизации
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const client = await auth.getClient();

    // Запрос к Google Sheets API
    const result = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range,
    });

    res.status(200).json({ values: result.data.values ?? [] });
  } catch (e) {
    console.error("Google Sheets error:", e);
    res.status(500).json({ error: e.message });
  }
}
