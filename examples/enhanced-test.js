#!/usr/bin/env node

// 增强的CSV MCP服务器测试示例 - 包含新的日志管理功能
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const examplePath = path.join(__dirname, 'sample.csv');

console.log('CSV MCP服务器增强功能测试示例');
console.log('===============================');

console.log('\n📖 1. 智能读取CSV文件（带日志功能）:');
console.log('工具: read_csv');
console.log('参数:', JSON.stringify({
  file_path: examplePath,
  limit: 2,
  use_log: true,
  force_read: false
}, null, 2));
console.log('说明: 自动跳过已读取的行，基于读取日志');

console.log('\n📊 2. 读取指定行数范围:');
console.log('工具: read_csv_range');
console.log('参数:', JSON.stringify({
  file_path: examplePath,
  start_row: 1,
  end_row: 3,
  save_to_log: true
}, null, 2));
console.log('说明: 读取第1-2行（索引1-2），并保存到日志');

console.log('\n🔍 3. 强制读取（忽略日志）:');
console.log('工具: read_csv');
console.log('参数:', JSON.stringify({
  file_path: examplePath,
  limit: 3,
  skip: 0,
  use_log: false,
  force_read: true
}, null, 2));
console.log('说明: 强制从头读取，不使用日志功能');

console.log('\n📝 4. 获取读取日志信息:');
console.log('工具: get_read_log');
console.log('参数:', JSON.stringify({
  file_path: examplePath
}, null, 2));
console.log('说明: 查看文件的读取历史和当前状态');

console.log('\n📋 5. 列出所有读取日志:');
console.log('工具: list_read_logs');
console.log('参数:', JSON.stringify({}, null, 2));
console.log('说明: 显示所有CSV文件的读取日志摘要');

console.log('\n🗑️  6. 清除读取日志:');
console.log('工具: clear_read_log');
console.log('参数:', JSON.stringify({
  file_path: examplePath
}, null, 2));
console.log('说明: 删除指定文件的读取日志，重置读取状态');

console.log('\n💾 7. 批量写入数据（现有功能）:');
console.log('工具: write_csv');
console.log('参数:', JSON.stringify({
  file_path: path.join(__dirname, 'test_output.csv'),
  data: [
    { id: "1", name: "测试1", status: "active" },
    { id: "2", name: "测试2", status: "inactive" },
    { id: "3", name: "测试3", status: "active" }
  ]
}, null, 2));

console.log('\n✨ 新功能特性:');
console.log('==============');
console.log('1. 📈 增量读取: 自动跳过已读取的行，避免重复处理');
console.log('2. 📊 范围读取: 精确控制读取的行数范围');
console.log('3. 📝 读取日志: 记录每次读取的详细信息');
console.log('4. 🔄 日志管理: 查看、清除、列出所有读取日志');
console.log('5. ⚙️  灵活控制: 可选择是否使用日志功能');

console.log('\n🗂️  日志文件位置:');
console.log(`${process.cwd()}/.csv-logs/`);

console.log('\n📖 使用场景示例:');
console.log('================');
console.log('场景1: 大文件增量处理');
console.log('  - 第一次: read_csv(limit=1000) -> 读取前1000行');
console.log('  - 第二次: read_csv(limit=1000) -> 自动从1001行开始读取');
console.log('  - 第三次: read_csv(limit=1000) -> 自动从2001行开始读取');

console.log('\n场景2: 特定范围处理');
console.log('  - read_csv_range(start_row=100, end_row=200) -> 读取第100-199行');
console.log('  - read_csv_range(start_row=500, end_row=600) -> 读取第500-599行');

console.log('\n场景3: 重置和重新处理');
console.log('  - clear_read_log() -> 清除读取历史');
console.log('  - read_csv(force_read=true) -> 强制从头开始');

// 检查示例文件
if (fs.existsSync(examplePath)) {
  console.log('\n✓ 示例文件已就绪:', examplePath);
  const content = fs.readFileSync(examplePath, 'utf8');
  const lines = content.trim().split('\n');
  console.log(`  总行数: ${lines.length - 1} 行数据 + 1 行标题`);
} else {
  console.log('\n✗ 示例文件不存在:', examplePath);
}
