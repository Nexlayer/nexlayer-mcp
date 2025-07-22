#!/usr/bin/env node

/**
 * Test script for MCP logging functionality
 * Tests the logging and tracing capabilities
 */

import { spawn } from 'child_process';

async function testMCPLogging() {
  console.log('🧪 Testing MCP Logging System...\n');
  
  // Start the MCP server
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverOutput = '';
  let serverError = '';

  server.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });

  server.stderr.on('data', (data) => {
    serverError += data.toString();
    console.log('📝 Server Log:', data.toString().trim());
  });

  // Send MCP initialization
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

  console.log('📤 Sending initialize message...');
  server.stdin.write(JSON.stringify(initMessage) + '\n');

  // Wait a moment for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test logging tool call
  const toolCallMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'nexlayer_get_recent_deployments',
      arguments: {
        limit: 5
      }
    }
  };

  console.log('📤 Testing logging tool...');
  server.stdin.write(JSON.stringify(toolCallMessage) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test deployment trace tool
  const traceMessage = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'nexlayer_deploy',
      arguments: {
        yamlContent: `application:
  name: "test-app"
  pods:
    - name: "test-pod"
      image: "nginx:latest"
      servicePorts: [80]`,
        sessionToken: 'test_session_123'
      }
    }
  };

  console.log('📤 Testing deployment with tracing...');
  server.stdin.write(JSON.stringify(traceMessage) + '\n');

  // Wait for deployment to complete
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test getting the deployment trace
  const getTraceMessage = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'nexlayer_get_deployment_trace',
      arguments: {
        sessionId: 'test_session_123'
      }
    }
  };

  console.log('📤 Testing deployment trace retrieval...');
  server.stdin.write(JSON.stringify(getTraceMessage) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Clean shutdown
  server.stdin.end();
  server.kill();

  console.log('\n✅ MCP Logging Test Complete!');
  console.log('\n📊 Server Output Summary:');
  console.log('- Server Errors:', serverError ? 'Yes' : 'None');
  console.log('- Logging Active:', serverError.includes('[MCP-LOG') ? 'Yes' : 'No');
  console.log('- Trace System:', serverError.includes('nexlayer_deploy') ? 'Active' : 'Inactive');
  
  if (serverError.includes('[MCP-LOG')) {
    console.log('\n🎉 Logging system is working correctly!');
  } else {
    console.log('\n⚠️  Logging may not be working as expected.');
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});

// Run the test
testMCPLogging().catch(console.error);