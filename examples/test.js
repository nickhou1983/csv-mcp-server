#!/usr/bin/env node

// 这是一个简单的测试脚本，演示如何使用CSV MCP服务器
// 注意：这个脚本不能直接运行，它只是展示了如何与MCP服务器交互的示例代码

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 示例数据
const sampleData = [
  { name: "张三", age: "25", city: "北京", salary: "8000" },
  { name: "李四", age: "30", city: "上海", salary: "12000" },
  { name: "王五", age: "28", city: "广州", salary: "10000" }
];

const examplePath = path.join(__dirname, 'sample.csv');

console.log('CSV MCP服务器测试示例');
console.log('===================');

console.log('\n1. 读取CSV文件示例:');
console.log('工具: read_csv');
console.log('参数:', JSON.stringify({
  file_path: examplePath,
  limit: 3
}, null, 2));

console.log('\n2. 写入CSV文件示例:');
console.log('工具: write_csv');
console.log('参数:', JSON.stringify({
  file_path: path.join(__dirname, 'output.csv'),
  data: sampleData
}, null, 2));

console.log('\n3. 添加新行示例:');
console.log('工具: add_csv_row');
console.log('参数:', JSON.stringify({
  file_path: examplePath,
  row_data: { name: "赵六", age: "32", city: "深圳", salary: "15000" }
}, null, 2));

console.log('\n4. 删除行示例:');
console.log('工具: delete_csv_row');
console.log('参数:', JSON.stringify({
  file_path: examplePath,
  row_index: 1
}, null, 2));

console.log('\n5. 更新行示例:');
console.log('工具: update_csv_row');
console.log('参数:', JSON.stringify({
  file_path: examplePath,
  row_index: 0,
  row_data: { salary: "9000" }
}, null, 2));

console.log('\n6. 查询数据示例:');
console.log('工具: query_csv');
console.log('参数:', JSON.stringify({
  file_path: examplePath,
  column: "city",
  value: "北京"
}, null, 2));

console.log('\n使用说明:');
console.log('========');
console.log('1. 确保服务器已启动: npm start');
console.log('2. 在支持MCP的客户端中使用这些工具');
console.log('3. 所有文件路径必须是绝对路径');
console.log('4. CSV文件会自动创建缺失的目录');

// 检查示例文件是否存在
if (fs.existsSync(examplePath)) {
  console.log('\n✓ 示例文件已创建:', examplePath);
  
  // 读取并显示示例文件内容
  const content = fs.readFileSync(examplePath, 'utf8');
  console.log('\n示例文件内容:');
  console.log('-------------');
  console.log(content);
} else {
  console.log('\n✗ 示例文件不存在:', examplePath);
}
