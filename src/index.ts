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

interface ReadLog {
  filePath: string;
  lastReadRow: number;
  totalRows: number;
  lastReadTime: string;
  readRanges: Array<{ start: number; end: number; readTime: string }>;
}

class CsvMcpServer {
  private server: Server;
  private logDir: string;

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

    // 设置日志目录
    this.logDir = path.join(process.cwd(), '.csv-logs');
    this.ensureLogDir();

    this.setupTools();
    this.setupToolHandlers();
  }

  private async ensureLogDir() {
    await fs.ensureDir(this.logDir);
  }

  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "read_csv",
            description: "读取CSV文件，支持指定行数限制，自动跳过已读取的行",
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
                use_log: {
                  type: "boolean",
                  description: "是否使用读取日志来跳过已读取的行（默认true）",
                },
                force_read: {
                  type: "boolean",
                  description: "是否强制读取（忽略日志，默认false）",
                },
              },
              required: ["file_path"],
            },
          },
          {
            name: "read_csv_range",
            description: "读取CSV文件的指定行数范围",
            inputSchema: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "CSV文件的完整路径",
                },
                start_row: {
                  type: "number",
                  description: "开始行号（从0开始）",
                  minimum: 0,
                },
                end_row: {
                  type: "number",
                  description: "结束行号（不包含，从0开始）",
                  minimum: 1,
                },
                save_to_log: {
                  type: "boolean",
                  description: "是否保存读取记录到日志（默认true）",
                },
              },
              required: ["file_path", "start_row", "end_row"],
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
          {
            name: "get_read_log",
            description: "获取CSV文件的读取日志信息",
            inputSchema: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "CSV文件的完整路径",
                },
              },
              required: ["file_path"],
            },
          },
          {
            name: "clear_read_log",
            description: "清除CSV文件的读取日志",
            inputSchema: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "CSV文件的完整路径",
                },
              },
              required: ["file_path"],
            },
          },
          {
            name: "list_read_logs",
            description: "列出所有CSV文件的读取日志",
            inputSchema: {
              type: "object",
              properties: {},
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
          case "read_csv_range":
            return await this.handleReadCsvRange(args || {}) as any;
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
          case "get_read_log":
            return await this.handleGetReadLog(args || {}) as any;
          case "clear_read_log":
            return await this.handleClearReadLog(args || {}) as any;
          case "list_read_logs":
            return await this.handleListReadLogs(args || {}) as any;
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
    const { file_path, limit, skip = 0, use_log = true, force_read = false } = args;
    
    if (!await fs.pathExists(file_path)) {
      throw new Error(`文件不存在: ${file_path}`);
    }

    let actualSkip = skip;
    let logInfo = null;

    // 如果启用日志且不强制读取，检查读取日志
    if (use_log && !force_read) {
      logInfo = await this.getReadLogInfo(file_path);
      if (logInfo && logInfo.lastReadRow >= 0) {
        actualSkip = Math.max(skip, logInfo.lastReadRow + 1);
      }
    }

    const data: CsvRow[] = [];
    let rowCount = 0;
    let skippedCount = 0;
    let totalProcessed = 0;

    return new Promise(async (resolve, reject) => {
      fs.createReadStream(file_path)
        .pipe(csv())
        .on("data", (row: CsvRow) => {
          if (skippedCount < actualSkip) {
            skippedCount++;
            totalProcessed++;
            return;
          }

          if (!limit || rowCount < limit) {
            data.push(row);
            rowCount++;
            totalProcessed++;
          }
        })
        .on("end", async () => {
          try {
            // 如果启用日志，保存读取记录
            if (use_log && data.length > 0) {
              await this.saveReadLog(file_path, actualSkip, actualSkip + data.length - 1, totalProcessed);
            }

            const message = [
              `成功读取CSV文件: ${file_path}`,
              `读取了 ${data.length} 行数据`,
              actualSkip > skip ? `(基于读取日志，从第 ${actualSkip} 行开始)` : '',
              use_log ? `读取日志已更新` : ''
            ].filter(Boolean).join('\n');

            resolve({
              content: [
                {
                  type: "text",
                  text: `${message}\n\n${JSON.stringify(data, null, 2)}`,
                },
              ],
            });
          } catch (error) {
            reject(error);
          }
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

  // 日志管理方法
  private getLogFilePath(csvFilePath: string): string {
    const fileName = path.basename(csvFilePath, '.csv');
    const hash = Buffer.from(csvFilePath).toString('base64').replace(/[/+=]/g, '_');
    return path.join(this.logDir, `${fileName}_${hash}.json`);
  }

  private async getReadLogInfo(csvFilePath: string): Promise<ReadLog | null> {
    const logFile = this.getLogFilePath(csvFilePath);
    try {
      if (await fs.pathExists(logFile)) {
        const logContent = await fs.readFile(logFile, 'utf8');
        return JSON.parse(logContent);
      }
    } catch (error) {
      console.error(`读取日志文件失败: ${error}`);
    }
    return null;
  }

  private async saveReadLog(csvFilePath: string, startRow: number, endRow: number, totalRows: number): Promise<void> {
    const logFile = this.getLogFilePath(csvFilePath);
    const now = new Date().toISOString();
    
    let logInfo: ReadLog = {
      filePath: csvFilePath,
      lastReadRow: endRow,
      totalRows: totalRows,
      lastReadTime: now,
      readRanges: []
    };

    // 读取现有日志
    const existingLog = await this.getReadLogInfo(csvFilePath);
    if (existingLog) {
      logInfo = existingLog;
      logInfo.lastReadRow = Math.max(logInfo.lastReadRow, endRow);
      logInfo.totalRows = Math.max(logInfo.totalRows, totalRows);
      logInfo.lastReadTime = now;
    }

    // 添加新的读取范围
    logInfo.readRanges.push({
      start: startRow,
      end: endRow,
      readTime: now
    });

    // 保持最近50个读取记录
    if (logInfo.readRanges.length > 50) {
      logInfo.readRanges = logInfo.readRanges.slice(-50);
    }

    await fs.writeFile(logFile, JSON.stringify(logInfo, null, 2));
  }

  // 新的处理方法
  private async handleReadCsvRange(args: Record<string, any>) {
    const { file_path, start_row, end_row, save_to_log = true } = args;
    
    if (!await fs.pathExists(file_path)) {
      throw new Error(`文件不存在: ${file_path}`);
    }

    if (start_row >= end_row) {
      throw new Error(`开始行号必须小于结束行号`);
    }

    const data: CsvRow[] = [];
    let currentRow = 0;

    return new Promise(async (resolve, reject) => {
      fs.createReadStream(file_path)
        .pipe(csv())
        .on("data", (row: CsvRow) => {
          if (currentRow >= start_row && currentRow < end_row) {
            data.push(row);
          }
          currentRow++;
          
          // 如果已经读取到结束行，可以提前结束
          if (currentRow >= end_row) {
            return;
          }
        })
        .on("end", async () => {
          try {
            // 保存到日志
            if (save_to_log && data.length > 0) {
              await this.saveReadLog(file_path, start_row, end_row - 1, currentRow);
            }

            resolve({
              content: [
                {
                  type: "text",
                  text: `成功读取CSV文件范围: ${file_path}\n行范围: ${start_row} - ${end_row - 1}\n读取了 ${data.length} 行数据\n${save_to_log ? '读取日志已更新' : ''}\n\n${JSON.stringify(data, null, 2)}`,
                },
              ],
            });
          } catch (error) {
            reject(error);
          }
        })
        .on("error", (error: any) => {
          reject(new Error(`读取CSV文件失败: ${error.message}`));
        });
    });
  }

  private async handleGetReadLog(args: Record<string, any>) {
    const { file_path } = args;
    
    try {
      const logInfo = await this.getReadLogInfo(file_path);
      
      if (!logInfo) {
        return {
          content: [
            {
              type: "text",
              text: `文件 ${file_path} 没有读取日志记录`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `CSV文件读取日志信息:\n文件路径: ${logInfo.filePath}\n最后读取行: ${logInfo.lastReadRow}\n总行数: ${logInfo.totalRows}\n最后读取时间: ${logInfo.lastReadTime}\n读取历史: ${logInfo.readRanges.length} 次\n\n${JSON.stringify(logInfo, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `获取读取日志失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleClearReadLog(args: Record<string, any>) {
    const { file_path } = args;
    
    try {
      const logFile = this.getLogFilePath(file_path);
      
      if (await fs.pathExists(logFile)) {
        await fs.remove(logFile);
        return {
          content: [
            {
              type: "text",
              text: `已清除文件 ${file_path} 的读取日志`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `文件 ${file_path} 没有读取日志记录`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `清除读取日志失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleListReadLogs(args: Record<string, any>) {
    try {
      const logFiles = await fs.readdir(this.logDir);
      const logs = [];
      
      for (const logFile of logFiles) {
        if (logFile.endsWith('.json')) {
          try {
            const logPath = path.join(this.logDir, logFile);
            const logContent = await fs.readFile(logPath, 'utf8');
            const logInfo: ReadLog = JSON.parse(logContent);
            logs.push({
              file: logInfo.filePath,
              lastReadRow: logInfo.lastReadRow,
              totalRows: logInfo.totalRows,
              lastReadTime: logInfo.lastReadTime,
              readCount: logInfo.readRanges.length
            });
          } catch (error) {
            console.error(`读取日志文件 ${logFile} 失败:`, error);
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `找到 ${logs.length} 个CSV文件的读取日志:\n\n${JSON.stringify(logs, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `列出读取日志失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("CSV MCP Server 正在运行...");
  }
}

const server = new CsvMcpServer();
server.run().catch(console.error);
