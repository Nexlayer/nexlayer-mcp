/**
 * Nexlayer MCP Server
 * Modular, AI-agent optimized Model Context Protocol server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Agent services
import { AgentDetectionService } from './agent/detection.js';
import { ToolRegistry } from './tools/registry.js';

// Core tools (6 essential tools only)
import { CoreTools } from './tools/core.js';
import { DaggerTools } from './tools/dagger.js';
import { AnalysisTools } from './tools/analysis.js';
import { GeneratorTools } from './tools/generator.js';

// Prompt modules
import { NexlayerDeploymentPrompts } from './prompts/nexlayer-deployment.js';

// Core services
import { NexlayerApiClient } from '../services/nexlayer-api.js';
import { FileGenerator } from '../services/file-generator.js';

// Types
import { AgentContext } from './agent/detection.js';

/**
 * Enhanced Nexlayer API Client with Agent Context
 */
class AIAwareNexlayerClient extends NexlayerApiClient {
  private agentContext: AgentContext;

  constructor(config: any, agentContext: AgentContext) {
    super(config);
    this.agentContext = agentContext;
    
    // Internal logging for agent tracking (stderr to avoid MCP JSON corruption)
    process.stderr.write(`[NEXLAYER-MCP] Agent detected: ${this.agentContext.identity} (${this.agentContext.client})\n`);
  }

  private getAgentMetadata() {
    return {
      _agent_metadata: {
        agent_type: this.agentContext.type,
        agent_identity: this.agentContext.identity,
        client_platform: this.agentContext.client,
        capabilities: this.agentContext.capabilities,
        session_id: this.agentContext.session_id,
        mcp_version: process.env.npm_package_version || "1.0.0",
        timestamp: new Date().toISOString()
      }
    };
  }

  async startUserDeployment(params: any) {
    const enhancedParams = {
      ...params,
      ...this.getAgentMetadata()
    };
    return super.startUserDeployment(enhancedParams);
  }

  async extendDeployment(params: any) {
    const enhancedParams = {
      ...params,
      ...this.getAgentMetadata()
    };
    return super.extendDeployment(enhancedParams);
  }

  async claimDeployment(params: any) {
    const enhancedParams = {
      ...params,
      ...this.getAgentMetadata()
    };
    return super.claimDeployment(enhancedParams);
  }

  async validateYaml(params: any) {
    const enhancedParams = {
      ...params,
      ...this.getAgentMetadata()
    };
    return super.validateYaml(enhancedParams);
  }

  async getSchema() {
    process.stderr.write(`[NEXLAYER-MCP] Schema request from ${this.agentContext.identity}\n`);
    return super.getSchema();
  }
}

/**
 * Main MCP Server Class
 */
export class NexlayerMcpServer {
  private server: McpServer;
  private agentDetection: AgentDetectionService;
  private toolRegistry: ToolRegistry;
  private nexlayerClient: AIAwareNexlayerClient | null = null;
  private fileGenerator: FileGenerator;

  constructor() {
    this.server = new McpServer({
      name: "nexlayer-mcp-server",
      version: process.env.npm_package_version || "1.0.0",
      capabilities: {
        logging: {}, // Enable MCP logging capability
      }
    });

    // Initialize services
    this.agentDetection = AgentDetectionService.getInstance();
    this.toolRegistry = new ToolRegistry(this.server, this.agentDetection.getAgentContext());
    this.fileGenerator = new FileGenerator();

    this.logInitialization();
    this.initializeTools();
  }

  private logInitialization(): void {
    const context = this.agentDetection.getAgentContext();
    const capabilities = this.agentDetection.getCapabilities();

    // Send initialization logs to stderr to avoid MCP JSON corruption
    process.stderr.write(`[NEXLAYER-MCP] Initialized for agent: ${JSON.stringify(context, null, 2)}\n`);
    
    if (capabilities.batch_operations) {
      process.stderr.write(`[NEXLAYER-MCP] Batch operations enabled for ${context.identity}\n`);
    }
    
    if (capabilities.file_system_access) {
      process.stderr.write(`[NEXLAYER-MCP] File system tools optimized for ${context.identity}\n`);
    }
  }

  private initializeTools(): void {
    // Initialize analysis tools (repository analysis, Dockerfile generation)
    new AnalysisTools(this.toolRegistry, this.getClient.bind(this));
    
    // Initialize generator tools (intelligent YAML generation)
    new GeneratorTools(this.toolRegistry, this.getClient.bind(this));
    
    // Initialize core tools (simplified)
    new CoreTools(this.toolRegistry, this.getClient.bind(this));
    
    // Initialize Dagger tools (image building only)
    new DaggerTools(this.toolRegistry, this.getClient.bind(this));
    
    // Initialize logging and tracing tools
    
    // Initialize prompt modules
    new NexlayerDeploymentPrompts(this.toolRegistry);
  }

  private getClient(sessionToken?: string): AIAwareNexlayerClient {
    if (!this.nexlayerClient) {
      this.nexlayerClient = new AIAwareNexlayerClient({
        sessionToken,
        baseUrl: 'https://app.nexlayer.io'
      }, this.agentDetection.getAgentContext());
    }
    return this.nexlayerClient;
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Export factory function for clean initialization
export function createNexlayerMcpServer(): NexlayerMcpServer {
  return new NexlayerMcpServer();
}