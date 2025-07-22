/**
 * MCP-Compliant Logging Utilities
 * Implements RFC 5424 severity levels with structured JSON messages
 * Following https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/logging
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type LogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

export interface LogData {
  [key: string]: any;
}

export interface MCPLogMessage {
  level: LogLevel;
  logger?: string;
  data: LogData;
}

export interface MCPLogger {
  debug(message: string, data?: LogData): void;
  info(message: string, data?: LogData): void;
  notice(message: string, data?: LogData): void;
  warning(message: string, data?: LogData): void;
  error(message: string, data?: LogData): void;
  critical(message: string, data?: LogData): void;
  alert(message: string, data?: LogData): void;
  emergency(message: string, data?: LogData): void;
}

export class NexlayerLogger implements MCPLogger {
  private server: McpServer;
  private loggerName: string;
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT = 100; // logs per minute
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

  constructor(server: McpServer, loggerName: string) {
    this.server = server;
    this.loggerName = loggerName;
  }

  private shouldRateLimit(): boolean {
    const now = Date.now();
    const key = this.loggerName;
    const limit = this.rateLimitMap.get(key);

    if (!limit || now > limit.resetTime) {
      // Reset or initialize rate limit
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      return false;
    }

    if (limit.count >= this.RATE_LIMIT) {
      return true; // Rate limited
    }

    limit.count++;
    return false;
  }

  private sanitizeData(data: LogData): LogData {
    if (!data) return {};

    const sanitized = { ...data };

    // Remove or hash sensitive information
    const sensitiveKeys = ['sessionToken', 'apiKey', 'password', 'secret', 'token'];
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        if (typeof value === 'string' && value.length > 8) {
          // Show first 3 and last 3 characters with hash in middle
          sanitized[key] = `${value.slice(0, 3)}...${value.slice(-3)}`;
        } else {
          sanitized[key] = '[REDACTED]';
        }
      }

      // Sanitize GitHub URLs to remove tokens
      if (typeof value === 'string' && value.includes('github.com')) {
        sanitized[key] = value.replace(/token=[^&\s]+/g, 'token=[REDACTED]');
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeData(value as LogData);
      }
    }

    return sanitized;
  }

  private log(level: LogLevel, message: string, data: LogData = {}) {
    if (this.shouldRateLimit()) {
      // If rate limited, only log critical and above
      if (!['critical', 'alert', 'emergency'].includes(level)) {
        return;
      }
    }

    const sanitizedData = this.sanitizeData(data);
    const logMessage: MCPLogMessage = {
      level,
      logger: this.loggerName,
      data: {
        message,
        timestamp: new Date().toISOString(),
        ...sanitizedData
      }
    };

    // Send to stderr to avoid corrupting MCP JSON-RPC on stdout
    try {
      // Use stderr for all logging to avoid MCP protocol corruption
      process.stderr.write(`[MCP-LOG-${level.toUpperCase()}] [${this.loggerName}] ${message} ${JSON.stringify(sanitizedData)}\n`);
    } catch (error) {
      // Fallback to basic stderr if JSON serialization fails
      process.stderr.write(`[MCP-LOG-${level.toUpperCase()}] [${this.loggerName}] ${message} [LOG_ERROR]\n`);
    }
  }

  debug(message: string, data?: LogData): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: LogData): void {
    this.log('info', message, data);
  }

  notice(message: string, data?: LogData): void {
    this.log('notice', message, data);
  }

  warning(message: string, data?: LogData): void {
    this.log('warning', message, data);
  }

  error(message: string, data?: LogData): void {
    this.log('error', message, data);
  }

  critical(message: string, data?: LogData): void {
    this.log('critical', message, data);
  }

  alert(message: string, data?: LogData): void {
    this.log('alert', message, data);
  }

  emergency(message: string, data?: LogData): void {
    this.log('emergency', message, data);
  }
}

/**
 * Create a logger instance for a specific component
 */
export function createLogger(server: McpServer, name: string): MCPLogger {
  return new NexlayerLogger(server, name);
}

/**
 * Logger factory for tool implementations
 */
export class LoggerFactory {
  private server: McpServer;
  private loggers = new Map<string, MCPLogger>();

  constructor(server: McpServer) {
    this.server = server;
  }

  getLogger(name: string): MCPLogger {
    if (!this.loggers.has(name)) {
      this.loggers.set(name, new NexlayerLogger(this.server, name));
    }
    return this.loggers.get(name)!;
  }

  // Pre-configured loggers for Nexlayer tools
  get clone() { return this.getLogger('nexlayer.clone'); }
  get analyze() { return this.getLogger('nexlayer.analyze'); }
  get dockerfile() { return this.getLogger('nexlayer.dockerfile'); }
  get build() { return this.getLogger('nexlayer.build'); }
  get yaml() { return this.getLogger('nexlayer.yaml'); }
  get deploy() { return this.getLogger('nexlayer.deploy'); }
  get core() { return this.getLogger('nexlayer.core'); }
  get registry() { return this.getLogger('nexlayer.registry'); }
}