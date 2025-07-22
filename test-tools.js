#!/usr/bin/env node

/**
 * Test MCP tools list to verify logging tools are registered
 */

import { spawn } from 'child_process';

console.log('🧪 Testing MCP Tools Registration...\n');

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responses = [];

server.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
      } catch (e) {
        // Not JSON, ignore
      }
    }
  });
});

server.stderr.on('data', (data) => {
  console.log('📝 Server:', data.toString().trim());
});

// Send initialization
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {
      logging: {}
    },
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

console.log('📤 Initializing MCP server...');
server.stdin.write(JSON.stringify(initMessage) + '\n');

setTimeout(() => {
  // Request tools list
  const toolsMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  };

  console.log('📤 Requesting tools list...');
  server.stdin.write(JSON.stringify(toolsMessage) + '\n');
  
  setTimeout(() => {
    server.stdin.end();
    server.kill();
    
    console.log('\n📋 **Available Tools:**');
    responses.forEach(response => {
      if (response.result && response.result.tools) {
        response.result.tools.forEach(tool => {
          const isLoggingTool = tool.name.includes('deployment_trace') || 
                               tool.name.includes('recent_deployments') || 
                               tool.name.includes('deployment_summary');
          const icon = isLoggingTool ? '🔍' : '🛠️';
          console.log(`${icon} ${tool.name}: ${tool.description}`);
        });
      }
    });
    
    // Check for our logging tools specifically
    const allTools = responses
      .filter(r => r.result && r.result.tools)
      .flatMap(r => r.result.tools)
      .map(t => t.name);
      
    const loggingTools = [
      'nexlayer_get_deployment_trace',
      'nexlayer_get_recent_deployments', 
      'nexlayer_get_deployment_summary'
    ];
    
    console.log('\n✅ **Logging Tools Check:**');
    loggingTools.forEach(tool => {
      const found = allTools.includes(tool);
      console.log(`${found ? '✅' : '❌'} ${tool}: ${found ? 'Registered' : 'Missing'}`);
    });
    
    const foundCount = loggingTools.filter(tool => allTools.includes(tool)).length;
    console.log(`\n📊 **Summary:** ${foundCount}/${loggingTools.length} logging tools registered`);
    
    if (foundCount === loggingTools.length) {
      console.log('🎉 All logging tools are properly registered!');
    } else {
      console.log('⚠️  Some logging tools may be missing.');
    }
  }, 2000);
}, 1000);