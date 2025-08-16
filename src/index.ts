#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs-extra";
import * as path from "path";
import csv from "csv-parser";
import * as createCsvWriter from "csv-writer";

interface CsvRow {
  [key: string]: string;
}

class CsvMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "csv-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.setupToolHandlers();
  }

  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "read_csv",
            description: "读取CSV文件，支持指定行数限制",
            inputSchema: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "CSV文件的完整路径",
                },
                limit: {
                  type: "number",
                  description: "要读取的行数限制（可选）",
                  minimum: 1,
                },
                skip: {
                  type: "number", 
                  description: "跳过的行数（可选）",
                  minimum: 0,
                },
              },
              required: ["file_path"],
            },
          },
          {
            name: "write_csv",
            description: "将数据写入CSV文件",
            inputSchema: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "CSV文件的完整路径",
                },
                data: {
                  type: "array",
                  description: "要写入的数据数组",
                  items: {
                    type: "object",
                  },
                },
                append: {
                  type: "boolean",
                  description: "是否追加到现有文件（默认为false，即覆盖）",
                },
              },
              required: ["file_path", "data"],
            },
          },
          {
            name: "add_csv_row",
            description: "向CSV文件添加新行",
            inputSchema: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "CSV文件的完整路径",
                },
                row_data: {
                  type: "object",
                  description: "要添加的行数据",
                },
              },
              required: ["file_path", "row_data"],
            },
          },
          {
            name: "delete_csv_row",
            description: "删除CSV文件中的指定行",
            inputSchema: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "CSV文件的完整路径",
                },
                row_index: {
                  type: "number",
                  description: "要删除的行索引（从0开始）",
                  minimum: 0,
                },
              },
              required: ["file_path", "row_index"],
            },
          },
          {
            name: "update_csv_row",
            description: "更新CSV文件中的指定行",
            inputSchema: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "CSV文件的完整路径",
                },
                row_index: {
                  type: "number",
                  description: "要更新的行索引（从0开始）",
                  minimum: 0,
                },
                row_data: {
                  type: "object",
                  description: "新的行数据",
                },
              },
              required: ["file_path", "row_index", "row_data"],
            },
          },
          {
            name: "query_csv",
            description: "查询CSV文件中的数据",
            inputSchema: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "CSV文件的完整路径",
                },
                column: {
                  type: "string",
                  description: "要查询的列名",
                },
                value: {
                  type: "string",
                  description: "要查找的值",
                },
              },
              required: ["file_path", "column", "value"],
            },
          },
        ],
      };
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case "read_csv":
            return await this.handleReadCsv(args || {}) as any;
          case "write_csv":
            return await this.handleWriteCsv(args || {}) as any;
          case "add_csv_row":
            return await this.handleAddCsvRow(args || {}) as any;
          case "delete_csv_row":
            return await this.handleDeleteCsvRow(args || {}) as any;
          case "update_csv_row":
            return await this.handleUpdateCsvRow(args || {}) as any;
          case "query_csv":
            return await this.handleQueryCsv(args || {}) as any;
          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleReadCsv(args: Record<string, any>) {
    const { file_path, limit, skip = 0 } = args;
    
    if (!await fs.pathExists(file_path)) {
      throw new Error(`文件不存在: ${file_path}`);
    }

    const data: CsvRow[] = [];
    let rowCount = 0;
    let skippedCount = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(file_path)
        .pipe(csv())
        .on("data", (row: CsvRow) => {
          if (skippedCount < skip) {
            skippedCount++;
            return;
          }

          if (!limit || rowCount < limit) {
            data.push(row);
            rowCount++;
          }
        })
        .on("end", () => {
          resolve({
            content: [
              {
                type: "text",
                text: `成功读取CSV文件: ${file_path}\n读取了 ${data.length} 行数据\n\n${JSON.stringify(data, null, 2)}`,
              },
            ],
          });
        })
        .on("error", (error: any) => {
          reject(new Error(`读取CSV文件失败: ${error.message}`));
        });
    });
  }

  private async handleWriteCsv(args: Record<string, any>) {
    const { file_path, data, append = false } = args;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("数据必须是非空数组");
    }

    // 确保目录存在
    await fs.ensureDir(path.dirname(file_path));

    // 获取列头
    const headers = Object.keys(data[0]);
    
    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: file_path,
      header: headers.map(h => ({ id: h, title: h })),
      append: append,
    });

    await csvWriter.writeRecords(data);

    return {
      content: [
        {
          type: "text",
          text: `成功${append ? '追加' : '写入'}数据到CSV文件: ${file_path}\n写入了 ${data.length} 行数据`,
        },
      ],
    };
  }

  private async handleAddCsvRow(args: Record<string, any>) {
    const { file_path, row_data } = args;

    // 如果文件不存在，创建新文件
    if (!await fs.pathExists(file_path)) {
      await this.handleWriteCsv({ file_path, data: [row_data] });
      return {
        content: [
          {
            type: "text",
            text: `创建新文件并添加行: ${file_path}`,
          },
        ],
      };
    }

    // 读取现有数据
    const existingData = await this.readCsvData(file_path);
    existingData.push(row_data);

    // 写回文件
    await this.handleWriteCsv({ file_path, data: existingData });

    return {
      content: [
        {
          type: "text",
          text: `成功添加新行到CSV文件: ${file_path}`,
        },
      ],
    };
  }

  private async handleDeleteCsvRow(args: Record<string, any>) {
    const { file_path, row_index } = args;

    if (!await fs.pathExists(file_path)) {
      throw new Error(`文件不存在: ${file_path}`);
    }

    const data = await this.readCsvData(file_path);

    if (row_index >= data.length) {
      throw new Error(`行索引超出范围: ${row_index}`);
    }

    data.splice(row_index, 1);

    await this.handleWriteCsv({ file_path, data });

    return {
      content: [
        {
          type: "text",
          text: `成功删除第 ${row_index} 行: ${file_path}`,
        },
      ],
    };
  }

  private async handleUpdateCsvRow(args: Record<string, any>) {
    const { file_path, row_index, row_data } = args;

    if (!await fs.pathExists(file_path)) {
      throw new Error(`文件不存在: ${file_path}`);
    }

    const data = await this.readCsvData(file_path);

    if (row_index >= data.length) {
      throw new Error(`行索引超出范围: ${row_index}`);
    }

    data[row_index] = { ...data[row_index], ...row_data };

    await this.handleWriteCsv({ file_path, data });

    return {
      content: [
        {
          type: "text",
          text: `成功更新第 ${row_index} 行: ${file_path}`,
        },
      ],
    };
  }

  private async handleQueryCsv(args: Record<string, any>) {
    const { file_path, column, value } = args;

    if (!await fs.pathExists(file_path)) {
      throw new Error(`文件不存在: ${file_path}`);
    }

    const data = await this.readCsvData(file_path);
    const results = data.filter(row => row[column] === value);

    return {
      content: [
        {
          type: "text",
          text: `查询结果 (${column} = ${value}):\n找到 ${results.length} 条记录\n\n${JSON.stringify(results, null, 2)}`,
        },
      ],
    };
  }

  private async readCsvData(file_path: string): Promise<CsvRow[]> {
    const data: CsvRow[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(file_path)
        .pipe(csv())
        .on("data", (row: CsvRow) => {
          data.push(row);
        })
        .on("end", () => {
          resolve(data);
        })
        .on("error", (error: any) => {
          reject(new Error(`读取CSV文件失败: ${error.message}`));
        });
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("CSV MCP Server 正在运行...");
  }
}

const server = new CsvMcpServer();
server.run().catch(console.error);
