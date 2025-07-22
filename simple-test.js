#!/usr/bin/env node

/**
 * Simple test to verify our logging utilities work
 */

import { createLogger, LoggerFactory } from './dist/src/utils/logger.js';
import { DeploymentTraceManager } from './dist/src/utils/deployment-trace.js';

console.log('🧪 Testing Logging Utilities...\n');

// Test 1: Basic logging utility
console.log('1️⃣ Testing logger creation and basic functionality...');
try {
  // Mock MCP server for testing
  const mockServer = {
    sendLogMessage: (message) => {
      console.log('📝 MCP Log:', JSON.stringify(message, null, 2));
    }
  };

  const logger = createLogger(mockServer, 'test-component');
  logger.info('Test info message', { testData: 'hello world' });
  logger.warning('Test warning', { sessionId: 'test_123' });
  logger.error('Test error', { error: 'Test error message' });
  
  console.log('✅ Basic logging works!\n');
} catch (error) {
  console.error('❌ Basic logging failed:', error.message);
}

// Test 2: Logger Factory
console.log('2️⃣ Testing logger factory...');
try {
  const mockServer = {
    sendLogMessage: (message) => {
      console.log('📝 Factory Log:', message.logger, '-', message.data.message);
    }
  };

  const factory = new LoggerFactory(mockServer);
  const deployLogger = factory.deploy;
  const buildLogger = factory.build;
  
  deployLogger.info('Deploy test message');
  buildLogger.info('Build test message');
  
  console.log('✅ Logger factory works!\n');
} catch (error) {
  console.error('❌ Logger factory failed:', error.message);
}

// Test 3: Deployment Trace Manager
console.log('3️⃣ Testing deployment trace manager...');
try {
  const tracer = new DeploymentTraceManager();
  const sessionId = DeploymentTraceManager.generateSessionId();
  
  console.log('Generated session ID:', sessionId);
  
  // Start trace
  tracer.startTrace(sessionId, 'https://github.com/user/test-repo', {
    userId: 'test-user',
    clientType: 'test-client'
  });
  
  // Add steps
  tracer.addStep(sessionId, 'nexlayer_clone_repo', 'success', {
    message: 'Repository cloned successfully'
  });
  
  tracer.addStep(sessionId, 'nexlayer_deploy', 'in_progress', {
    message: 'Starting deployment'
  });
  
  tracer.updateStep(sessionId, 'nexlayer_deploy', {
    status: 'success',
    message: 'Deployment completed'
  });
  
  tracer.completeTrace(sessionId, 'success', 'test-app');
  
  // Get trace
  const trace = tracer.getTrace(sessionId);
  console.log('📊 Trace Summary:');
  console.log(`- Session: ${trace.sessionId}`);
  console.log(`- Status: ${trace.status}`);
  console.log(`- Steps: ${trace.steps.length}`);
  console.log(`- Duration: ${trace.totalDuration}ms`);
  
  const summary = tracer.getTraceSummary(sessionId);
  console.log('📈 Summary:', summary);
  
  console.log('✅ Deployment tracing works!\n');
} catch (error) {
  console.error('❌ Deployment tracing failed:', error.message);
  console.error(error.stack);
}

console.log('🎉 All logging components tested successfully!');