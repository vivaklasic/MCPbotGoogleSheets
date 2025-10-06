import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";

const sheets = google.sheets("v4");

class GoogleSheetsMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "google-sheets-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async getAuthClient() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    return await auth.getClient();
  }

  setupHandlers() {
    // Список доступних інструментів
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "read_sheet",
          description: "Читає дані з Google Sheets таблиці",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: {
                type: "string",
                description: "ID Google Sheets документа",
              },
              range: {
                type: "string",
                description: "Діапазон комірок (наприклад: 'Sheet1!A1:D10')",
              },
            },
            required: ["spreadsheetId", "range"],
          },
        },
        {
          name: "get_sheet_info",
          description: "Отримує інформацію про таблицю (назви аркушів, метадані)",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: {
                type: "string",
                description: "ID Google Sheets документа",
              },
            },
            required: ["spreadsheetId"],
          },
        },
        {
          name: "read_multiple_ranges",
          description: "Читає дані з декількох діапазонів одночасно",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: {
                type: "string",
                description: "ID Google Sheets документа",
              },
              ranges: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "Масив діапазонів комірок",
              },
            },
            required: ["spreadsheetId", "ranges"],
          },
        },
      ],
    }));

    // Обробка викликів інструментів
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "read_sheet":
            return await this.handleReadSheet(request.params.arguments);
          case "get_sheet_info":
            return await this.handleGetSheetInfo(request.params.arguments);
          case "read_multiple_ranges":
            return await this.handleReadMultipleRanges(request.params.arguments);
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async handleReadSheet(args) {
    const { spreadsheetId, range } = args;

    if (!spreadsheetId || !range) {
      throw new Error("spreadsheetId та range є обов'язковими параметрами");
    }

    const client = await this.getAuthClient();
    const result = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range,
    });

    const values = result.data.values ?? [];
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              range: result.data.range,
              majorDimension: result.data.majorDimension,
              values: values,
              rowCount: values.length,
              columnCount: values[0]?.length ?? 0,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async handleGetSheetInfo(args) {
    const { spreadsheetId } = args;

    if (!spreadsheetId) {
      throw new Error("spreadsheetId є обов'язковим параметром");
    }

    const client = await this.getAuthClient();
    const result = await sheets.spreadsheets.get({
      auth: client,
      spreadsheetId,
    });

    const info = {
      title: result.data.properties.title,
      locale: result.data.properties.locale,
      timeZone: result.data.properties.timeZone,
      sheets: result.data.sheets.map((sheet) => ({
        title: sheet.properties.title,
        sheetId: sheet.properties.sheetId,
        index: sheet.properties.index,
        gridProperties: {
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount,
        },
      })),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  }

  async handleReadMultipleRanges(args) {
    const { spreadsheetId, ranges } = args;

    if (!spreadsheetId || !ranges || !Array.isArray(ranges)) {
      throw new Error("spreadsheetId та ranges (масив) є обов'язковими параметрами");
    }

    const client = await this.getAuthClient();
    const result = await sheets.spreadsheets.values.batchGet({
      auth: client,
      spreadsheetId,
      ranges,
    });

    const valueRanges = result.data.valueRanges.map((vr) => ({
      range: vr.range,
      values: vr.values ?? [],
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(valueRanges, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Google Sheets MCP server running on stdio");
  }
}

const server = new GoogleSheetsMCPServer();
server.run().catch(console.error);
