# CSV MCP Server

一个基于Model Context Protocol (MCP) 的CSV文件操作服务器，提供完整的CSV文件读写和CRUD功能，支持增量读取和智能日志管理。

## 功能特性

✅ **Stdio模式** - 使用标准输入输出进行通信  
✅ **智能读取** - 支持增量读取，自动跳过已读取的行  
✅ **范围读取** - 支持读取指定行数范围  
✅ **读取日志** - 自动记录读取历史，避免重复处理  
✅ **写入CSV文件** - 支持新建文件或追加模式  
✅ **完整CRUD操作** - 增加、删除、修改、查询CSV数据  
✅ **日志管理** - 查看、清除、列出所有读取日志  
✅ **错误处理** - 完善的错误处理和异常管理  
✅ **TypeScript** - 完全使用TypeScript开发，提供类型安全

## 安装

```bash
# 克隆项目
git clone <repository-url>
cd csv-mcp-server

# 安装依赖
npm install

# 构建项目
npm run build
```

## 可用工具

### 1. read_csv - 智能读取CSV文件
读取CSV文件内容，支持增量读取和自动跳过已读取的行。

**参数:**
- `file_path` (string, 必需): CSV文件的完整路径
- `limit` (number, 可选): 读取的行数限制
- `skip` (number, 可选): 跳过的行数，默认为0
- `use_log` (boolean, 可选): 是否使用读取日志来跳过已读取的行，默认true
- `force_read` (boolean, 可选): 是否强制读取（忽略日志），默认false

**示例:**
```json
{
  "file_path": "/path/to/data.csv",
  "limit": 100,
  "use_log": true,
  "force_read": false
}
```

### 2. read_csv_range - 读取指定行数范围
读取CSV文件的指定行数范围。

**参数:**
- `file_path` (string, 必需): CSV文件的完整路径
- `start_row` (number, 必需): 开始行号（从0开始）
- `end_row` (number, 必需): 结束行号（不包含，从0开始）
- `save_to_log` (boolean, 可选): 是否保存读取记录到日志，默认true

**示例:**
```json
{
  "file_path": "/path/to/data.csv",
  "start_row": 10,
  "end_row": 20,
  "save_to_log": true
}
```

### 2. write_csv - 写入CSV文件
将数据数组写入CSV文件。

**参数:**
- `file_path` (string, 必需): CSV文件的完整路径
- `data` (array, 必需): 要写入的数据数组
- `append` (boolean, 可选): 是否追加到现有文件，默认为false（覆盖）

**示例:**
```json
{
  "file_path": "/path/to/output.csv",
  "data": [
    {"name": "张三", "age": "25", "city": "北京"},
    {"name": "李四", "age": "30", "city": "上海"}
  ],
  "append": false
}
```

### 3. add_csv_row - 添加新行
向CSV文件添加新的数据行。

**参数:**
- `file_path` (string, 必需): CSV文件的完整路径
- `row_data` (object, 必需): 要添加的行数据

**示例:**
```json
{
  "file_path": "/path/to/data.csv",
  "row_data": {"name": "王五", "age": "28", "city": "广州"}
}
```

### 4. delete_csv_row - 删除行
删除CSV文件中指定索引的行。

**参数:**
- `file_path` (string, 必需): CSV文件的完整路径
- `row_index` (number, 必需): 要删除的行索引（从0开始）

**示例:**
```json
{
  "file_path": "/path/to/data.csv",
  "row_index": 2
}
```

### 5. update_csv_row - 更新行
更新CSV文件中指定行的数据。

**参数:**
- `file_path` (string, 必需): CSV文件的完整路径
- `row_index` (number, 必需): 要更新的行索引（从0开始）
- `row_data` (object, 必需): 新的行数据

**示例:**
```json
{
  "file_path": "/path/to/data.csv",
  "row_index": 0,
  "row_data": {"salary": "9000"}
}
```

### 6. query_csv - 查询数据
在CSV文件中查询匹配指定条件的数据。

**参数:**
- `file_path` (string, 必需): CSV文件的完整路径
- `column` (string, 必需): 要查询的列名
- `value` (string, 必需): 要查找的值

**示例:**
```json
{
  "file_path": "/path/to/data.csv",
  "column": "city",
  "value": "北京"
}
```

### 7. get_read_log - 获取读取日志
获取CSV文件的读取日志信息。

**参数:**
- `file_path` (string, 必需): CSV文件的完整路径

**示例:**
```json
{
  "file_path": "/path/to/data.csv"
}
```

### 8. clear_read_log - 清除读取日志
清除CSV文件的读取日志，重置读取状态。

**参数:**
- `file_path` (string, 必需): CSV文件的完整路径

**示例:**
```json
{
  "file_path": "/path/to/data.csv"
}
```

### 9. list_read_logs - 列出所有读取日志
列出所有CSV文件的读取日志摘要。

**参数:** 无

**示例:**
```json
{}
```

## 使用方法

### 启动服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 在MCP客户端中使用

服务器启动后，可以在任何支持MCP协议的客户端中使用这些工具。服务器会通过stdio进行通信。

### 测试示例

运行测试示例查看使用方法：

```bash
# 基础功能测试
npm test

# 增强功能测试（包含日志管理）
node examples/enhanced-test.js
```

这会显示所有工具的使用示例和参数格式。

## 增量读取和日志管理

### 智能增量读取

服务器会自动记录每次读取的行数，下次读取时自动跳过已读取的行：

```json
// 第一次读取
{"file_path": "/data.csv", "limit": 100}  // 读取第0-99行

// 第二次读取  
{"file_path": "/data.csv", "limit": 100}  // 自动从第100行开始读取

// 第三次读取
{"file_path": "/data.csv", "limit": 100}  // 自动从第200行开始读取
```

### 读取日志管理

- **日志文件位置**: `.csv-logs/` 目录
- **日志内容**: 包含最后读取行、总行数、读取历史等
- **日志格式**: JSON格式，便于查看和管理

### 灵活控制选项

```json
// 使用日志功能（默认）
{"file_path": "/data.csv", "use_log": true}

// 禁用日志功能
{"file_path": "/data.csv", "use_log": false}

// 强制从头读取（忽略日志）
{"file_path": "/data.csv", "force_read": true}

// 读取特定范围
{"file_path": "/data.csv", "start_row": 100, "end_row": 200}
```

## 在MCP客户端中配置

将以下配置添加到您的MCP客户端配置文件中：

```json
{
  "mcpServers": {
    "csv-mcp-server": {
      "command": "node",
      "args": ["<项目路径>/dist/index.js"],
      "description": "CSV文件操作MCP服务器"
    }
  }
}
```

请将 `<项目路径>` 替换为您的实际项目路径。

## 项目结构

```
csv-mcp-server/
├── src/
│   └── index.ts          # 主要服务器代码
├── examples/
│   ├── sample.csv        # 示例CSV文件
│   ├── test.js          # 基础测试示例脚本
│   └── enhanced-test.js  # 增强功能测试示例
├── .csv-logs/            # 读取日志目录（自动创建）
├── dist/                 # 编译后的JavaScript文件
├── mcp-config.json       # MCP客户端配置示例
├── package.json
├── tsconfig.json
└── README.md
```

## 依赖项

- `@modelcontextprotocol/sdk` - MCP协议SDK
- `csv-parser` - CSV解析库
- `csv-writer` - CSV写入库
- `fs-extra` - 增强的文件系统操作

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建项目
npm run build

# 启动生产服务器
npm start
```

## 注意事项

1. 所有文件路径必须使用绝对路径
2. 服务器会自动创建不存在的目录
3. CSV文件采用UTF-8编码
4. 行索引从0开始计算
5. 错误信息会通过MCP协议返回

## 许可证

MIT License
