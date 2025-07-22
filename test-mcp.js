#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Nexlayer MCP Server...\n');

// Test 1: Check if dist/index.js exists
import { existsSync } from 'fs';
const distPath = join(__dirname, 'dist', 'index.js');

if (!existsSync(distPath)) {
  console.error('❌ dist/index.js not found. Run "npm run build" first.');
  process.exit(1);
}

console.log('✅ Build artifacts found');

// Test 2: Test server startup
const server = spawn('node', [distPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

server.on('close', (code) => {
  if (code === 0) {
    console.log('✅ MCP server started successfully');
    console.log('📋 Server output:', output.trim());
  } else {
    console.error('❌ MCP server failed to start');
    console.error('Error:', errorOutput);
  }
});

// Kill server after 3 seconds
setTimeout(() => {
  server.kill();
  console.log('\n🎉 MCP server test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Configure Cursor with cursor-mcp-config.json');
  console.log('2. Restart Cursor');
  console.log('3. Test with: "Deploy my app to Nexlayer"');
}, 3000); 