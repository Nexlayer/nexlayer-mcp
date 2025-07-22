/**
 * Nexlayer MCP Server Entry Point
 * Clean, modular entry point following MCP best practices
 */

import { createNexlayerMcpServer } from './src/server.js';

async function main() {
  try {
    const server = createNexlayerMcpServer();
    await server.start();
  } catch (error) {
    // Send to stderr to avoid corrupting MCP JSON on stdout
    process.stderr.write(`[NEXLAYER-MCP] Failed to start server: ${error}\n`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  // Graceful shutdown - no console output to avoid corrupting MCP JSON
  process.exit(0);
});

process.on('SIGTERM', () => {
  // Graceful shutdown - no console output to avoid corrupting MCP JSON
  process.exit(0);
});

main().catch((error) => {
  // Send to stderr to avoid corrupting MCP JSON on stdout
  process.stderr.write(`[NEXLAYER-MCP] Unhandled error: ${error}\n`);
  process.exit(1);
});