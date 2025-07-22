# Nexlayer MCP Server

A Model Context Protocol (MCP) server that provides tools for deploying and managing applications on the Nexlayer cloud platform through AI agents.

## Features

This MCP server provides 14 essential tools for complete application deployment workflows with AI agent optimization:

### Core Deployment Tools
- `nexlayer_complete_deployment` - **NEW** Complete 6-step workflow orchestrator (recommended for new deployments)
- `nexlayer_deploy` - Final deployment step (requires prepared YAML with ttl.sh images)
- `nexlayer_extend_deployment` - Extend deployment duration using session token
- `nexlayer_claim_deployment` - Claim ownership of a deployment
- `nexlayer_get_schema` - Get current YAML schema with LLM-friendly examples and validation
- `nexlayer_add_deployment_reservation` - Reserve application names to prevent conflicts
- `nexlayer_remove_deployment_reservation` - Release reserved application names
- `nexlayer_get_reservations` - List all active deployment reservations
- `nexlayer_feedback` - Send feedback to Nexlayer team

### Repository Analysis Tools
- `nexlayer_clone_repo` - Clone GitHub repositories for analysis
- `nexlayer_analyze_repository` - Deep project analysis with framework detection
- `nexlayer_detect_env_and_secrets` - Scan for environment variables and secrets

### Container Building Tools
- `nexlayer_build_images` - Build container images using Dagger and push to ttl.sh

### File Generation Tools
- `nexlayer_generate_intelligent_dockerfile` - AI-powered Dockerfile generation (overwrites existing broken Dockerfiles)
- `nexlayer_generate_intelligent_yaml` - Schema-driven YAML configuration generation

## Advanced Features

- **6-Step Workflow Orchestration**: Guided deployment process with `nexlayer_complete_deployment`
- **Schema-Driven YAML Generation**: Automatically fetches and uses current Nexlayer schema
- **Dockerfile Overwrite Protection**: Automatically fixes broken existing Dockerfiles
- **AI Agent Optimization**: Automatically detects and optimizes for different AI clients (Claude, Cursor, Windsurf)
- **Session Tracking**: Complete deployment lifecycle tracking with performance metrics
- **Structured Logging**: Comprehensive logging with parameter sanitization
- **Error Handling**: Detailed error messages with troubleshooting guidance
- **Security**: Built-in parameter validation and sanitization

## Installation

### Cursor IDE

Add to your `cursor-mcp-config.json`:

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

### Claude Desktop

Add to your `claude_desktop_config.json`:

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

**Configuration file locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Other AI Clients

Configure in your MCP settings using the same command structure.

## API Integration

The server integrates with these Nexlayer API endpoints:

### Core Deployment
- `POST /startUserDeployment` - Deploy applications with validation
- `POST /extendDeployment` - Extend deployment duration  
- `POST /claimDeployment` - Claim deployment ownership

### Validation & Schema
- `GET /schema` - Get YAML schema for configuration
- `POST /validate` - Validate YAML configuration
- `POST /feedback` - Submit feedback to Nexlayer team

### Reservation Management  
- `POST /addDeploymentReservation` - Reserve application names
- `POST /removeDeploymentReservation` - Release name reservations
- `GET /getReservations` - List active reservations

### Advanced Features
- Agent metadata injection for analytics
- Session token management
- Error categorization and guidance

## Authentication

Authentication uses session tokens:
- Initial deployments return session tokens
- Management operations require session tokens
- Tokens are automatically managed by the tools
- Agent metadata is included in all API calls

## Usage

### Basic Deployment
```
"Deploy https://github.com/username/repository to Nexlayer"
```

### Advanced Deployment
```
"Deploy with custom YAML configuration"
"Auto-generate deployment config from project analysis"
"Validate my YAML before deploying"
```

### Deployment Management
```
"Extend my deployment with session token abc123"
"Claim deployment my-app with token def456"
"Send feedback about my deployment experience"
```

## 6-Step Deployment Workflow

1. **Clone** - Download repository from GitHub with `nexlayer_clone_repo`
2. **Analyze** - Detect frameworks, dependencies, and configuration with `nexlayer_analyze_repository`
3. **Generate** - Create optimized Dockerfiles with `nexlayer_generate_intelligent_dockerfile`
4. **Build** - Build container images with `nexlayer_build_images` using Dagger
5. **Configure** - Generate Nexlayer YAML with `nexlayer_generate_intelligent_yaml`
6. **Deploy** - Deploy to Nexlayer platform with `nexlayer_deploy`

## Development

### Project Structure
```
src/
├── server.ts           # MCP server initialization and agent detection
├── tools/              # Modular tool implementations
│   ├── registry.ts     # Centralized tool registration system
│   ├── core.ts         # Deployment lifecycle tools (5 tools)
│   ├── analysis.ts     # Repository analysis tools (3 tools)
│   ├── dagger.ts       # Container building tools (1 tool)
│   └── generator.ts    # File generation tools (2 tools)
├── services/           # External service integrations
├── utils/              # Logging, tracing, and utilities
├── prompts/            # AI agent guidance prompts
└── agent/              # AI agent detection and optimization
```

### Adding New Tools

1. Define interfaces in `types/nexlayer.ts`
2. Add API methods in `services/nexlayer-api.ts`
3. Implement in appropriate tool module
4. Register in module's `registerTools()` method
5. Follow the standardized tool implementation pattern

### Building

```bash
npm install
npm run build
```

## Error Handling

All tools include comprehensive error handling with:
- Detailed error messages with context
- Troubleshooting guidance and solutions
- Session tracking for debugging
- Parameter sanitization for security
- Error categorization (validation, resource, network, etc.)

## Performance & Security

- **Rate Limiting**: Built-in protection against abuse
- **Input Validation**: Comprehensive parameter validation
- **Error Sanitization**: Never expose internal system details
- **Resource Management**: Automatic cleanup of temporary files
- **Caching**: Optimized API response caching

## License

MIT

## Support

- [GitHub Issues](https://github.com/nexlayer/nexlayer-mcp/issues)
- [Nexlayer Platform](https://app.nexlayer.io)
- [Developer Guide](./DEVELOPER_GUIDE.md) - Complete technical documentation
