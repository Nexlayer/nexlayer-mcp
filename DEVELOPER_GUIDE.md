# Nexlayer MCP Developer Guide

**Technical documentation for developers working on the Nexlayer MCP Server**

This guide covers the internal architecture, development workflows, and implementation patterns for the Nexlayer Model Context Protocol server.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [ASCII Architecture Diagram](#ascii-architecture-diagram)
- [Core Concepts](#core-concepts)
- [Tool Implementation](#tool-implementation)
- [API Integration](#api-integration)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Architecture Overview

### System Design

The Nexlayer MCP Server follows a modular, production-ready architecture:

```
src/
├── server.ts              # MCP server initialization and agent detection
├── tools/                 # Modular tool implementations
│   ├── registry.ts        # Centralized tool registration system
│   ├── core.ts           # Deployment lifecycle tools (3 tools)
│   ├── analysis.ts       # Repository analysis tools (3 tools)
│   ├── dagger.ts         # Container building tools (1 tool)
│   └── generator.ts      # File generation tools (2 tools)
├── services/             # External service integrations
│   └── buildAndPushImages.ts  # Dagger container builds
├── utils/                # Cross-cutting concerns
│   ├── logger.ts         # Structured logging system
│   └── deployment-trace.ts    # Session tracking and tracing
├── prompts/              # AI agent guidance prompts
│   └── nexlayer-deployment.ts # 6-step workflow prompts
└── agent/                # AI agent detection and optimization
    └── detection.ts      # Client-specific optimizations
```

## ASCII Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           NEXLAYER MCP SERVER ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI CLIENT     │    │   CURSOR IDE    │    │  CLAUDE DESKTOP │    │    WINDSURF     │
│                 │    │                 │    │                 │    │                 │
│  • Claude       │    │  • MCP Config   │    │  • MCP Config   │    │  • MCP Config   │
│  • Cursor       │    │  • Tool Access  │    │  • Tool Access  │    │  • Tool Access  │
│  • Windsurf     │    │  • Deployment   │    │  • Deployment   │    │  • Deployment   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │                      │
          └──────────────────────┼──────────────────────┼──────────────────────┘
                                 │                      │
                    ┌─────────────▼─────────────┐      │
                    │     MCP PROTOCOL          │      │
                    │                           │      │
                    │  • JSON-RPC over stdio   │      │
                    │  • Tool registration     │      │
                    │  • Parameter validation  │      │
                    │  • Response formatting   │      │
                    └─────────────┬─────────────┘      │
                                  │                    │
                    ┌─────────────▼─────────────┐      │
                    │    MCP SERVER CORE        │      │
                    │                           │      │
                    │  • Server initialization │      │
                    │  • Agent detection       │      │
                    │  • Session management    │      │
                    │  • Error handling        │      │
                    └─────────────┬─────────────┘      │
                                  │                    │
                    ┌─────────────▼─────────────┐      │
                    │    TOOL REGISTRY          │      │
                    │                           │      │
                    │  • Centralized registry  │      │
                    │  • Parameter sanitization│      │
                    │  • Session tracking      │      │
                    │  • Performance monitoring│      │
                    └─────────────┬─────────────┘      │
                                  │                    │
          ┌───────────────────────┼────────────────────┘
          │                       │
          │         ┌─────────────▼─────────────┐
          │         │      TOOL MODULES         │
          │         │                           │
          │         │  ┌─────────────────────┐  │
          │         │  │     CORE TOOLS      │  │
          │         │  │                     │  │
          │         │  │ • nexlayer_deploy   │  │
          │         │  │ • nexlayer_extend   │  │
          │         │  │ • nexlayer_claim    │  │
          │         │  │ • nexlayer_validate │  │
          │         │  │ • nexlayer_feedback │  │
          │         │  └─────────────────────┘  │
          │         │                           │
          │         │  ┌─────────────────────┐  │
          │         │  │   ANALYSIS TOOLS    │  │
          │         │  │                     │  │
          │         │  │ • clone_repo        │  │
          │         │  │ • analyze_repo      │  │
          │         │  │ • detect_env        │  │
          │         │  └─────────────────────┘  │
          │         │                           │
          │         │  ┌─────────────────────┐  │
          │         │  │   DAGGER TOOLS      │  │
          │         │  │                     │  │
          │         │  │ • build_images      │  │
          │         │  └─────────────────────┘  │
          │         │                           │
          │         │  ┌─────────────────────┐  │
          │         │  │  GENERATOR TOOLS    │  │
          │         │  │                     │  │
          │         │  │ • generate_docker   │  │
          │         │  │ • generate_yaml     │  │
          │         │  └─────────────────────┘  │
          │         └───────────────────────────┘
          │                       │
          │         ┌─────────────▼─────────────┐
          │         │    UTILITY LAYER          │
          │         │                           │
          │         │  ┌─────────────────────┐  │
          │         │  │     LOGGER          │  │
          │         │  │                     │  │
          │         │  │ • Structured logs   │  │
          │         │  │ • Rate limiting     │  │
          │         │  │ • Error tracking    │  │
          │         │  └─────────────────────┘  │
          │         │                           │
          │         │  ┌─────────────────────┐  │
          │         │  │ DEPLOYMENT TRACER   │  │
          │         │  │                     │  │
          │         │  │ • Session tracking │  │
          │         │  │ • Step monitoring  │  │
          │         │  │ • Performance data │  │
          │         │  └─────────────────────┘  │
          │         └───────────────────────────┘
          │                       │
          │         ┌─────────────▼─────────────┐
          │         │   NEXLAYER API CLIENT     │
          │         │                           │
          │         │  • HTTP client wrapper   │
          │         │  • Authentication        │
          │         │  • Error handling        │
          │         │  • Response parsing      │
          │         │  • Agent metadata        │
          │         └─────────────┬─────────────┘
          │                       │
          │         ┌─────────────▼─────────────┐
          │         │   EXTERNAL SERVICES       │
          │         │                           │
          │         │  ┌─────────────────────┐  │
          │         │  │   NEXLAYER CLOUD    │  │
          │         │  │                     │  │
          │         │  │ • Deployment API    │  │
          │         │  │ • Validation API    │  │
          │         │  │ • Schema API        │  │
          │         │  │ • Feedback API      │  │
          │         │  └─────────────────────┘  │
          │         │                           │
          │         │  ┌─────────────────────┐  │
          │         │  │     DAGGER          │  │
          │         │  │                     │  │
          │         │  │ • Container builds  │  │
          │         │  │ • Multi-platform    │  │
          │         │  │ • Registry push     │  │
          │         │  └─────────────────────┘  │
          │         │                           │
          │         │  ┌─────────────────────┐  │
          │         │  │   TTL.SH REGISTRY   │  │
          │         │  │                     │  │
          │         │  │ • Temporary images  │  │
          │         │  │ • Auto-expiration   │  │
          │         │  │ • No authentication │  │
          │         │  └─────────────────────┘  │
          │         └───────────────────────────┘
          │
          └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DEPLOYMENT WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ STEP 1  │    │ STEP 2  │    │ STEP 3  │    │ STEP 4  │    │ STEP 5  │    │ STEP 6  │
│         │    │         │    │         │    │         │    │         │    │         │
│ CLONE   │───▶│ ANALYZE │───▶│ BUILD   │───▶│ CONFIG  │───▶│ DEPLOY  │───▶│ MONITOR │
│ REPO    │    │ REPO    │    │ IMAGES  │    │ YAML    │    │ TO      │    │ STATUS  │
│         │    │         │    │         │    │         │    │ CLOUD   │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CONFIGURATION PATHS                                │
└─────────────────────────────────────────────────────────────────────────────────┘

LOCAL DEVELOPMENT (Your Setup):
┌─────────────────────────────────────────────────────────────────────────────────┐
│ cursor-mcp-config.json                                                         │
│ {                                                                               │
│   "mcpServers": {                                                              │
│     "nexlayer": {                                                              │
│       "command": "node",                                                       │
│       "args": ["/Users/salstagroup/nexlayer-mcp/dist/index.js"],              │
│       "env": { "NODE_ENV": "production" }                                     │
│     }                                                                          │
│   }                                                                            │
│ }                                                                               │
└─────────────────────────────────────────────────────────────────────────────────┘

PRODUCTION INSTALL:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ~/Library/Application Support/Cursor/User/mcp-config.json                      │
│ {                                                                               │
│   "mcpServers": {                                                              │
│     "nexlayer": {                                                              │
│       "command": "npx",                                                        │
│       "args": ["nexlayer-mcp@latest"]                                         │
│     }                                                                          │
│   }                                                                            │
│ }                                                                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RECENT UPDATES                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

✅ TypeScript Configuration:
   • Updated target to ES2023 for findLastIndex() support
   • Added lib: ["ES2023"] for modern JavaScript features
   • Fixed compilation errors in deployment-trace.ts and logger.ts

✅ Local Development Setup:
   • Absolute path configuration for local builds
   • Development-friendly MCP server configuration
   • Hot-reload capability for code changes

✅ Error Handling:
   • Improved YAML validation error messages
   • Better feedback for "Missing application field" errors
   • Enhanced troubleshooting guidance

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TECHNICAL SPECS                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

• Language: TypeScript 5.0+
• Runtime: Node.js 18+
• Protocol: MCP (Model Context Protocol) v1.0
• Architecture: Modular, event-driven
• Tools: 9 essential deployment tools
• API: RESTful with JSON responses
• Security: Parameter sanitization, session tracking
• Monitoring: Structured logging, performance metrics
• Compatibility: Claude, Cursor, Windsurf, and other MCP clients

## Core Concepts

### Tool Registry System

The `ToolRegistry` class provides centralized tool registration with built-in features:

```typescript
export class ToolRegistry {
  registerTool(name: string, config: ToolConfig, handler: ToolHandler): void {
    // Automatic features:
    // - Parameter sanitization for security
    // - Session tracking and correlation
    // - Performance monitoring
    // - Error handling with context
    // - Agent-specific optimizations
  }
}
```

**Benefits:**
- **Consistent Patterns**: All tools follow the same registration pattern
- **Built-in Logging**: Automatic session tracking and performance metrics
- **Security**: Parameter sanitization to prevent data leaks
- **Error Handling**: Standardized error responses with troubleshooting

### AI Agent Awareness

The server adapts to different AI clients:

```typescript
export class AIAwareNexlayerClient extends NexlayerApiClient {
  // Automatically adds agent metadata to all API calls
  private getAgentMetadata() {
    return {
      _agent_metadata: {
        agent_type: this.agentContext.type,        // "claude" | "cursor" | "windsurf"
        agent_identity: this.agentContext.identity, // Specific version
        client_platform: this.agentContext.client,  // Platform details
        capabilities: this.agentContext.capabilities, // ["batch_operations", "file_system_access"]
        session_id: this.agentContext.session_id,
        mcp_version: "1.0.0",
        timestamp: new Date().toISOString()
      }
    };
  }
}
```

### Session Management

Each deployment gets tracked across tool invocations:

```typescript
// Session tracking example
const sessionId = params.sessionToken?.slice(0, 16) || 'generated-session-id';

// Trace deployment steps
this.tracer.startTrace(sessionId, undefined, {
  userId: 'mcp-user',
  clientType: 'nexlayer-mcp',
  mcpVersion: '1.0.0'
});

this.tracer.addStep(sessionId, 'nexlayer_deploy', 'in_progress', {
  message: 'Starting deployment process'
});
```

## Tool Implementation

### 14 Essential Tools

#### Core Deployment Tools (`core.ts`)

| Tool | Purpose | API Endpoint |
|------|---------|--------------|
| `nexlayer_complete_deployment` | **NEW** Complete 6-step workflow orchestrator | N/A (orchestrates other tools) |
| `nexlayer_deploy` | Final deployment step (Step 6 only) | `POST /startUserDeployment` |
| `nexlayer_extend_deployment` | Extend deployment duration | `POST /extendDeployment` |
| `nexlayer_claim_deployment` | Take ownership of deployment | `POST /claimDeployment` |
| `nexlayer_get_schema` | Get YAML schema for configuration | `GET /schema` |
| `nexlayer_add_deployment_reservation` | Reserve application names | `POST /addDeploymentReservation` |
| `nexlayer_remove_deployment_reservation` | Remove name reservations | `POST /removeDeploymentReservation` |
| `nexlayer_get_reservations` | List all active reservations | `GET /getReservations` |
| `nexlayer_feedback` | Send feedback to Nexlayer team | `POST /feedback` |

#### Repository Analysis Tools (`analysis.ts`)

| Tool | Purpose | Features |
|------|---------|----------|
| `nexlayer_clone_repo` | Clone GitHub repositories | Secure temporary directories |
| `nexlayer_analyze_repository` | Deep project analysis | Framework detection, dependency scanning |
| `nexlayer_detect_env_and_secrets` | Environment scanning | Secret detection, service identification |

#### Container Building Tools (`dagger.ts`)

| Tool | Purpose | Features |
|------|---------|----------|
| `nexlayer_build_images` | Build containers with Dagger | Multi-platform builds, ttl.sh registry |

#### File Generation Tools (`generator.ts`)

| Tool | Purpose | Features |
|------|---------|----------|
| `nexlayer_generate_intelligent_dockerfile` | AI-powered Dockerfile generation | Framework-specific optimization |
| `nexlayer_generate_intelligent_yaml` | Smart Nexlayer YAML generation | Resource optimization, best practices |

### Tool Implementation Pattern

Each tool follows this standardized pattern:

```typescript
private registerExampleTool(): void {
  this.registry.registerTool(
    "nexlayer_example_tool",
    {
      title: "Human-Readable Title",
      description: "Clear description of what this tool does",
      inputSchema: {
        requiredParam: z.string().describe("Description of required parameter"),
        optionalParam: z.boolean().optional().default(false).describe("Optional parameter with default"),
        enumParam: z.enum(['option1', 'option2']).optional().describe("Enumerated options")
      }
    },
    async (params) => {
      const sessionId = params.sessionToken?.slice(0, 16) || 'tool-session';
      
      // Logging
      this.logger.info('Tool execution started', {
        tool: 'nexlayer_example_tool',
        sessionId,
        params: this.sanitizeParams(params)
      });

      try {
        // Tool implementation
        const client = this.getClient(params.sessionToken);
        const result = await client.exampleApiMethod(params);
        
        // Success logging
        this.logger.info('Tool execution completed', {
          tool: 'nexlayer_example_tool',
          sessionId,
          success: true
        });

        // Return structured response
        return {
          content: [
            {
              type: "text",
              text: `✅ **Operation Successful**\n\n**Result:** ${result.summary}\n\n💡 **Next Steps:**\n- Use \`nexlayer_next_tool\` to continue workflow`
            },
            {
              type: "text", 
              text: `**🤖 LLM-Friendly Data:**\n\`\`\`json\n${JSON.stringify(result.structured, null, 2)}\n\`\`\`\n\n**Usage:** This data can be used by subsequent tools in the workflow.`
            }
          ]
        };
      } catch (error: any) {
        // Error logging
        this.logger.error('Tool execution failed', {
          tool: 'nexlayer_example_tool',
          sessionId,
          error: error.message
        });

        // Return error with troubleshooting
        return {
          content: [{
            type: "text",
            text: `❌ **Operation Failed**\n\n**Error:** ${error.message}\n\n💡 **Troubleshooting:**\n- Check parameter values\n- Verify prerequisites\n- Review error details above`
          }]
        };
      }
    }
  );
}
```

### Response Format Standards

All tools return responses in this structure:

```typescript
// Human-readable primary response
{
  type: "text",
  text: "✅ **Success Message**\n\nDetailed explanation with formatting\n\n💡 **Next Steps:**\n- Actionable guidance"
}

// Machine-readable structured data
{
  type: "text",
  text: "**🤖 LLM-Friendly Data:**\n```json\n{\"structured\": \"data\"}\n```\n\n**Usage:** How AI agents should use this data"
}
```

## API Integration

### Nexlayer Platform APIs

The MCP server integrates with all Nexlayer platform endpoints:

```typescript
export class NexlayerApiClient {
  // Core deployment
  async startUserDeployment(params: StartUserDeploymentParams): Promise<DeploymentResult>
  async extendDeployment(params: ExtendDeploymentParams): Promise<DeploymentResult>
  async claimDeployment(params: ClaimDeploymentParams): Promise<DeploymentResult>
  
  // Validation and schema
  async getSchema(): Promise<SchemaResult>
  async validateYaml(params: ValidateYamlParams): Promise<ValidationResult>
  
  // Reservation management (available but not exposed as tools)
  async addDeploymentReservation(params: AddDeploymentReservationParams): Promise<void>
  async removeDeploymentReservation(params: RemoveDeploymentReservationParams): Promise<void>
  async getReservations(params: GetReservationsParams): Promise<Reservation[]>
}
```

### Authentication Flow

```typescript
// 1. Initial deployment (no token required)
const result = await client.startUserDeployment({ yamlContent });
// Returns: { sessionToken: "abc123", url: "https://app.nexlayer.ai", ... }

// 2. Management operations (token required)  
await client.extendDeployment({ 
  sessionToken: "abc123", 
  applicationName: "my-app" 
});

await client.claimDeployment({
  sessionToken: "abc123",
  applicationName: "my-app"
});
```

### Error Handling

API errors are handled consistently across all tools:

```typescript
try {
  const result = await client.apiMethod(params);
  return successResponse(result);
} catch (error: any) {
  // Categorize error types
  const isValidationError = error.message.includes('Invalid YAML') || 
                           error.message.includes('Missing application') ||
                           error.message.includes('validation');
  
  const isResourceError = error.message.includes('memory') ||
                         error.message.includes('cpu') ||
                         error.message.includes('resource');
  
  // Provide specific guidance
  const errorAdvice = isValidationError 
    ? getValidationErrorAdvice(error)
    : isResourceError 
    ? getResourceErrorAdvice(error)
    : getGenericErrorAdvice(error);
  
  return errorResponse(error, errorAdvice);
}
```

## Development Workflow

### Adding New Tools

Follow this process to add new tools:

1. **Define Types** in `types/nexlayer.ts`:
```typescript
export interface NewToolParams {
  requiredParam: string;
  optionalParam?: boolean;
}

export interface NewToolResult {
  success: boolean;
  data: any;
}
```

2. **Add API Method** in `services/nexlayer-api.ts`:
```typescript
async newApiMethod(params: NewToolParams): Promise<NewToolResult> {
  try {
    const response = await this.client.post<NexlayerApiResponse<NewToolResult>>('/newEndpoint', params);
    return response.data.data!;
  } catch (error: any) {
    throw new Error(`Failed to execute new operation: ${error.response?.data?.error || error.message}`);
  }
}
```

3. **Choose Module** based on functionality:
- **Core deployment operations** → `src/tools/core.ts`
- **Analysis and scanning** → `src/tools/analysis.ts`
- **Container building** → `src/tools/dagger.ts`
- **File generation** → `src/tools/generator.ts`

4. **Implement Tool** following the standard pattern
5. **Register Tool** in module's `registerTools()` method
6. **Test Integration** with build and runtime verification

### Code Standards

**TypeScript Configuration:**
```typescript
// Use strict typing
interface ToolConfig {
  title?: string;
  description: string;
  inputSchema: Record<string, z.ZodType<any>>;
}

// Follow async patterns
const handler: ToolHandler = async (params) => {
  // Implementation
};
```

**Error Handling:**
```typescript
// Always include session context
this.logger.error('Operation failed', {
  tool: 'tool-name',
  sessionId,
  error: error.message,
  params: this.sanitizeParams(params)
});

// Provide actionable guidance
return {
  content: [{
    type: "text",
    text: `❌ **Error Description**\n\n💡 **Solutions:**\n- Specific step 1\n- Specific step 2`
  }]
};
```

**Security Best Practices:**
```typescript
// Sanitize sensitive parameters
private sanitizeParams(params: any): any {
  const sensitiveKeys = ['sessionToken', 'apiKey', 'password', 'secret'];
  const sanitized = { ...params };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = typeof value === 'string' && value.length > 8 
        ? `${value.slice(0, 3)}...${value.slice(-3)}`
        : '[REDACTED]';
    }
  }
  
  return sanitized;
}
```

### Building and Testing

**Development Build:**
```bash
npm run build        # TypeScript compilation
npm run dev         # Development mode with hot reload
npm run test        # Run test suite
npm run lint        # Code quality checks
```

**Production Build:**
```bash
npm run build:prod  # Optimized production build
npm run package     # Create distribution package
```

**Testing Tools:**
```bash
# Test specific tool
npx @modelcontextprotocol/cli test path/to/nexlayer-mcp

# Test with real AI client
claude-desktop --config path/to/config.json
```

## Testing

### Unit Testing

Test individual tools in isolation:

```typescript
// tools/core.test.ts
describe('CoreTools', () => {
  it('should deploy application successfully', async () => {
    const mockClient = createMockNexlayerClient();
    const coreTools = new CoreTools(mockRegistry, () => mockClient);
    
    const result = await coreTools.deploy({
      yamlContent: validYamlContent,
      sessionToken: 'test-token'
    });
    
    expect(result.content[0].text).toContain('Deployment Successful');
  });
});
```

### Integration Testing

Test complete workflows:

```typescript
// integration/deployment.test.ts
describe('6-Step Deployment Workflow', () => {
  it('should execute complete deployment', async () => {
    // 1. Clone repository
    const cloneResult = await executeTool('nexlayer_clone_repo', {
      repoUrl: 'https://github.com/test/repo'
    });
    
    // 2. Analyze structure
    const analysisResult = await executeTool('nexlayer_analyze_repository', {
      repoPath: cloneResult.repoPath
    });
    
    // 3-6. Continue workflow...
    // Verify each step and final deployment
  });
});
```

### Manual Testing

Use the MCP CLI for manual testing:

```bash
# Install MCP CLI
npm install -g @modelcontextprotocol/cli

# Test server
mcp test nexlayer-mcp

# Test specific tool
mcp call nexlayer-mcp nexlayer_deploy '{"yamlContent": "..."}'
```

## Deployment

### NPM Package

The server is distributed as an NPM package:

```json
{
  "name": "nexlayer-mcp",
  "version": "1.3.1",
  "main": "dist/index.js",
  "bin": {
    "nexlayer-mcp": "dist/index.js"
  },
  "files": [
    "dist/",
    "package.json",
    "README.md"
  ]
}
```

### Release Process

1. **Version Bump**: Update version in `package.json`
2. **Build**: Run `npm run build` to compile TypeScript
3. **Test**: Verify with `npm run test` and manual testing
4. **Publish**: Use `npm publish` to release to NPM registry
5. **Tag**: Create git tag for version tracking

### Distribution

Users install via NPM and configure in their AI clients:

```json
{
  "mcpServers": {
    "nexlayer": {
      "command": "npx",
      "args": ["nexlayer-mcp@latest"]
    }
  }
}
```

## Contributing

### Development Setup

1. **Clone Repository**:
```bash
git clone https://github.com/nexlayer/nexlayer-mcp.git
cd nexlayer-mcp
```

2. **Install Dependencies**:
```bash
npm install
```

3. **Development Environment**:
```bash
npm run dev  # Start development server
```

4. **Testing**:
```bash
npm run test     # Run test suite
npm run lint     # Check code quality
npm run build    # Verify build
```

### Pull Request Process

1. **Branch**: Create feature branch from `main`
2. **Implement**: Follow coding standards and patterns
3. **Test**: Add tests for new functionality
4. **Document**: Update relevant documentation
5. **Review**: Submit PR with clear description
6. **Merge**: After approval and CI validation

### Code Review Checklist

- [ ] Follows MCP TypeScript SDK patterns
- [ ] Includes comprehensive error handling
- [ ] Returns structured data for AI agents
- [ ] Implements proper logging and tracing
- [ ] Sanitizes sensitive parameters
- [ ] Includes unit tests
- [ ] Updates documentation
- [ ] Follows security best practices

### Architecture Decisions

**Why 9 Tools?**
- **CTO Requirement**: Simplified from 22 tools (68% reduction)
- **Essential Only**: Covers complete 6-step deployment workflow
- **Deployment Management**: Added extend/claim for production use
- **Maintainable**: Clear boundaries and responsibilities

**Why Modular Structure?**
- **Scalability**: Easy to add new tool categories
- **Maintainability**: Clear separation of concerns
- **Testing**: Isolated unit testing per module
- **Code Reuse**: Shared patterns and utilities

**Why Agent-Aware Design?**
- **Optimization**: Different AI clients have different capabilities
- **Analytics**: Track which agents use which features
- **Future-Proof**: Adapt to new AI client capabilities
- **User Experience**: Optimize responses per client type

### Performance Optimization

**Tool Optimization Strategies:**

1. **Caching**: Cache API responses and analysis results
```typescript
private cache = new Map<string, { data: any; expires: number }>();

private getCachedResult(key: string): any | null {
  const cached = this.cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  return null;
}
```

2. **Parallel Processing**: Execute independent operations concurrently
```typescript
// Parallel API calls
const [schema, validation] = await Promise.all([
  client.getSchema(),
  client.validateYaml({ yamlContent })
]);
```

3. **Lazy Loading**: Load heavy dependencies only when needed
```typescript
private async getDaggerClient() {
  if (!this.daggerClient) {
    this.daggerClient = await import('@dagger.io/dagger');
  }
  return this.daggerClient;
}
```

4. **Resource Management**: Clean up temporary files and connections
```typescript
// Automatic cleanup
process.on('exit', () => {
  this.cleanupTempFiles();
  this.closeConnections();
});
```

### Security Considerations

**Input Validation:**
```typescript
// Validate all inputs
const schema = z.object({
  repoUrl: z.string().url().startsWith('https://github.com/'),
  sessionToken: z.string().optional(),
  timeout: z.number().min(1000).max(300000).optional()
});
```

**Rate Limiting:**
```typescript
// Prevent abuse
private rateLimiter = new Map<string, { count: number; resetTime: number }>();

private checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = this.rateLimiter.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    this.rateLimiter.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (userLimit.count >= 10) return false;
  userLimit.count++;
  return true;
}
```

**Error Sanitization:**
```typescript
// Never expose internal errors
private sanitizeError(error: any): string {
  if (error.code === 'ENOTFOUND') {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (error.response?.status === 401) {
    return 'Authentication failed. Please check your credentials.';
  }
  return 'An unexpected error occurred. Please try again.';
}
```

---

This developer guide provides the complete technical foundation for working with the Nexlayer MCP Server. For user-facing documentation, see the [README](./README.md).