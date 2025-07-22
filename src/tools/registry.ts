/**
 * Tool Registry and Wrapper System
 * Centralized tool registration following MCP TypeScript SDK best practices
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AgentContext } from '../agent/detection.js';
import { LoggerFactory } from '../utils/logger.js';
import { DeploymentTraceManager, deploymentTracer } from '../utils/deployment-trace.js';

export type ToolHandler = (params: any) => Promise<any>;
export type PromptHandler = (args: any) => { messages: Array<{ role: "user" | "assistant"; content: { type: "text"; text: string } }> };

export interface ToolConfig {
  title?: string;
  description: string;
  inputSchema: Record<string, z.ZodType<any>>;
}

export interface PromptConfig {
  title: string;
  description: string;
  argsSchema: Record<string, z.ZodSchema<any>>;
}

export class ToolRegistry {
  private server: McpServer;
  private agentContext: AgentContext;
  private loggerFactory: LoggerFactory;
  private tracer: DeploymentTraceManager;

  constructor(server: McpServer, agentContext: AgentContext) {
    this.server = server;
    this.agentContext = agentContext;
    this.loggerFactory = new LoggerFactory(server);
    this.tracer = deploymentTracer;
  }

  /**
   * Register a tool following MCP TypeScript SDK patterns with integrated logging
   */
  registerTool(name: string, config: ToolConfig, handler: ToolHandler): void {
    const logger = this.loggerFactory.getLogger(name);
    
    this.server.registerTool(
      name,
      {
        title: config.title || name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: config.description,
        inputSchema: config.inputSchema
      },
      async (params: any) => {
        const startTime = Date.now();
        
        // Extract or generate session ID for tracing
        const sessionId = params.sessionId || 
                         params.sessionToken?.slice(0, 16) || 
                         `tool_${Date.now().toString(36)}`;

        logger.info(`Tool execution started`, { 
          tool: name, 
          sessionId,
          params: this.sanitizeParams(params)
        });

        try {
          // Parameters come pre-validated by MCP SDK
          const result = await handler(params);
          
          const duration = Date.now() - startTime;
          
          logger.info(`Tool execution completed`, {
            tool: name,
            sessionId,
            duration,
            success: true
          });
          
          // Add agent-specific optimizations if needed
          if (this.agentContext.capabilities.includes('structured_responses')) {
            // Could enhance with structured metadata here
          }
          
          return result;
        } catch (error: any) {
          const duration = Date.now() - startTime;
          
          logger.error(`Tool execution failed`, {
            tool: name,
            sessionId,
            duration,
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 3) // First 3 lines of stack trace
          });
          
          throw error;
        }
      }
    );
  }

  /**
   * Register a prompt following MCP TypeScript SDK patterns
   */
  registerPrompt(name: string, config: PromptConfig, handler: PromptHandler): void {
    this.server.registerPrompt(
      name,
      {
        title: config.title,
        description: config.description,
        argsSchema: config.argsSchema
      },
      handler
    );
  }

  /**
   * Get agent context for tool implementations
   */
  getAgentContext(): AgentContext {
    return this.agentContext;
  }

  /**
   * Check if agent has specific capability
   */
  hasCapability(capability: string): boolean {
    return this.agentContext.capabilities.includes(capability);
  }

  /**
   * Get logger factory for tool implementations
   */
  getLoggerFactory(): LoggerFactory {
    return this.loggerFactory;
  }

  /**
   * Get deployment tracer for session tracking
   */
  getTracer(): DeploymentTraceManager {
    return this.tracer;
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeParams(params: any): any {
    if (!params || typeof params !== 'object') return params;

    const sanitized = { ...params };
    const sensitiveKeys = ['sessionToken', 'apiKey', 'password', 'secret', 'token'];

    for (const [key, value] of Object.entries(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        if (typeof value === 'string' && value.length > 8) {
          sanitized[key] = `${value.slice(0, 3)}...${value.slice(-3)}`;
        } else {
          sanitized[key] = '[REDACTED]';
        }
      }
    }

    return sanitized;
  }
}