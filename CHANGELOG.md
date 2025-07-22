# Changelog

All notable changes to the Nexlayer MCP Server project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.3] - 2025-07-11

### Summary
This release resolves the critical issue where Claude Desktop users experienced "Required" parameter validation errors when trying to deploy valid YAML configurations. The root cause was identified as incompatible MCP SDK patterns that worked in some clients but failed in others. All tools have been updated to follow the official MCP TypeScript SDK specification for universal compatibility.

### Added

#### 🌐 HTTP Tools & Direct API Access
- **Generic HTTP Request Tool**: `http-request` for direct API calls when MCP wrappers fail
- **Direct Nexlayer Deployment**: `nexlayer-deploy-direct` bypassing MCP parameter validation issues
- **Universal API compatibility**: Works with any REST endpoint following MCP SDK patterns

### Fixed

#### 🔧 MCP TypeScript SDK Compliance
- **Tool Registration**: Changed from deprecated `server.tool()` to official `server.registerTool()`
- **Input Schema Format**: Converted from `z.object({...})` to direct `{...}` object format
- **Parameter Validation**: Removed manual Zod parsing, now handled by MCP SDK automatically
- **Universal Compatibility**: All 20+ tools now work consistently across ALL MCP clients

#### 🎯 Claude Desktop Parameter Issues
- **Root Cause Fixed**: Parameter validation failures were due to incorrect MCP SDK usage
- **Tool Registration**: Proper title generation and inputSchema object format
- **Error Resolution**: Eliminated "Required" parameter errors in Claude Desktop

### Technical Improvements

#### 📋 Universal MCP Client Support
- **Cursor, VS Code, Windsurf**: File-based MCP clients fully supported
- **Claude Desktop**: Chat-based MCP client compatibility restored
- **CLI Tools**: Command-line MCP clients work correctly
- **Future-Proof**: Follows official MCP TypeScript SDK standards exactly

#### 🏗️ Architecture Cleanup
- **Removed Hybrid Layer**: Eliminated compatibility workarounds for cleaner codebase
- **SDK Compliance**: 100% adherence to official MCP TypeScript SDK documentation
- **Consistent Patterns**: All tools follow identical registration and validation patterns

---

## [1.3.2] - 2025-07-11

### Added

#### 🚀 Universal Deployment Intelligence
- **Smart-Deploy Universal Agent**: Enhanced smart-deploy tool to handle ANY containerizable application
  - **Multi-component detection**: React/Vue/Angular frontends, Node/Python/Go backends, external APIs
  - **External service integration**: Auto-detects Supabase, OpenAI, MongoDB Atlas, and other cloud services
  - **Cloud-native architecture understanding**: Intelligently handles microservices and complex deployments
  - **Schema-driven YAML generation**: Uses live Nexlayer schema endpoint instead of hardcoded values

#### 🐳 Linux/AMD64 Compliance & Container Optimization
- **Platform enforcement**: All Docker builds now use `linux/amd64` architecture for Nexlayer compatibility
- **Build resilience**: Enhanced auto-recovery for common Docker build failures
- **Image optimization**: Automatic .dockerignore and nginx.conf generation for frontend projects
- **Registry flexibility**: Support for multiple container registries with ttl.sh as default

#### 🧠 Intelligent API Response Integration
- **Helpful validation errors**: Leverages Nexlayer's `/postValidate` endpoint for actionable guidance
- **Smart deployment feedback**: Uses `/startUserDeployment` helpful responses for error interpretation
- **Auto-fix mechanisms**: Attempts intelligent YAML fixes based on Nexlayer's specific error messages
- **Error recovery**: Comprehensive error interpretation with step-by-step guidance

#### 🔧 Enhanced Error Handling & User Experience
- **Intelligent validation**: `performIntelligentValidation()` with auto-fix capabilities
- **Smart deployment**: `performIntelligentDeployment()` with actionable error guidance
- **Error interpretation**: Detailed error analysis for validation, deployment, and API issues
- **Recovery suggestions**: Specific troubleshooting steps based on error patterns

### Enhanced

#### 📋 MCP TypeScript SDK Best Practices
- **Tool registration**: Removed deprecated `title` field from tool configurations
- **Error handling**: Comprehensive validation and graceful failure modes
- **Agent analytics**: Enhanced tracking and optimization for different AI agents
- **Schema compliance**: Full adherence to MCP TypeScript SDK patterns

#### 🎯 Universal Application Support
- **Framework detection**: Enhanced stack analysis for any web framework
- **External service mapping**: Automatic detection and configuration of cloud services
- **Multi-container support**: Handles complex applications with multiple components
- **Production readiness**: Built-in best practices for cloud-native deployments

### Technical Improvements

#### 🏗️ Architecture Enhancements
- **Modular error handling**: Separate methods for validation, deployment, and API error interpretation
- **Recovery mechanisms**: Auto-fix capabilities based on common deployment patterns
- **Schema integration**: Live schema fetching and validation against Nexlayer API
- **Platform standardization**: Consistent linux/amd64 builds across all deployment scenarios

#### 📊 Code Quality
- **Error interpretation methods**: `interpretValidationErrors()`, `interpretDeploymentError()`, `parseNexlayerError()`
- **Auto-fix algorithms**: `attemptIntelligentYamlFix()` with pattern-based corrections
- **Build recovery**: `handleBuildFailure()` with automatic issue resolution
- **Comprehensive logging**: Real-time deployment progress with detailed status updates

### Benefits

#### 🤖 For AI Agents
- **Universal deployment**: Can handle any containerizable application without manual configuration
- **Intelligent guidance**: Receives actionable feedback from Nexlayer API for error resolution
- **Auto-recovery**: Automatically fixes common deployment issues without human intervention
- **Schema-aware**: Always generates valid YAML using live Nexlayer schema

#### 👨‍💻 For Developers
- **Platform compatibility**: Guaranteed linux/amd64 Docker builds for Nexlayer
- **Error clarity**: Detailed, actionable error messages with specific troubleshooting steps
- **Build resilience**: Automatic recovery from common Docker and deployment failures
- **Universal support**: Deploy any tech stack - from simple React apps to complex microservices

#### 🏢 For Production
- **Reliability**: Enhanced error handling and automatic recovery mechanisms
- **Scalability**: Supports complex multi-component applications and microservices
- **Compliance**: Platform-specific builds ensure compatibility with Nexlayer infrastructure
- **Monitoring**: Comprehensive logging and error tracking for deployment debugging

---

## [1.3.1] - 2025-07-10

### Fixed
- **MCP JSON Communication**: Fixed JSON parsing errors in Claude Desktop by moving all console.log statements to stderr
- **Tool Module Registration**: Completed implementation of all 4 tool modules (DeploymentTools, GeneratorTools, AnalysisTools, SmartDeployTools)
- **TypeScript Compilation**: Fixed all type errors in tool implementations and API client integration
- **Tool Availability**: Restored all 15+ tools that were missing after modular refactor

### Added
- **Complete Tool Restoration**: Implemented all missing tools from original monolithic version
  - **DeploymentTools**: 11 tools including add-database, add-prisma-backend, add-openai-integration, create-full-stack, extend-deployment, claim-deployment, manage-reservation, get-reservations
  - **GeneratorTools**: 4 tools including generate-dockerfile, generate-nexlayer-yaml, generate-full-stack-project, generate-files-locally
  - **AnalysisTools**: 3 tools including get-nexlayer-schema, detect-env-and-secrets, validate-yaml
  - **SmartDeployTools**: 3 tools including smart-deploy, build-and-push-docker, deploy-react-hello-world

### Enhanced
- **Prompt System**: Updated all 5 prompts to accurately reflect the complete tool set with proper categorization
- **Tool Documentation**: Enhanced prompt descriptions to include all database, service, and management tools
- **Error Handling**: Improved error messages and validation across all tool modules
- **API Integration**: Verified all tools correctly map to Nexlayer API endpoints

### Technical
- **Module Architecture**: All 4 tool modules now properly initialized in server.ts
- **Type Safety**: Fixed PodConfig type compatibility issues in deployment tools
- **Build Process**: Ensured clean TypeScript compilation with no errors
- **MCP Compliance**: Maintained full MCP TypeScript SDK best practices

## [1.3.0] - 2025-07-10

### Added

#### 🏗️ Modular MCP Architecture (BREAKING CHANGE)
- **Complete Refactor**: Restructured from monolithic 1400+ line index.ts to clean modular architecture
- **MCP TypeScript SDK Compliance**: Full implementation following official SDK best practices
- **Separation of Concerns**: Organized into dedicated services, tools, and prompt modules
- **Clean Entry Point**: 32-line index.ts with graceful shutdown handling

#### 📚 MCP TypeScript SDK Best Practices Implementation
- **Proper Tool Registration**: All tools now use Zod schema validation following SDK patterns
- **Structured Prompts**: 5 comprehensive prompts with type-safe argument schemas
- **Message Format Compliance**: Proper role/content structure for AI agent communication
- **Input Validation**: Runtime type checking with descriptive error messages

#### 🎪 Comprehensive Prompt System (5 prompts)
- **`nexlayer-deployment-guide`** - Expert deployment workflow guidance with decision trees
- **`nexlayer-quick-deploy`** - Predefined scenarios (existing-project, new-react-app, new-fullstack-app, demo-app, yaml-deployment)
- **`deploy-fullstack-app`** - Natural language deployment orchestrator for any application
- **`manage-nexlayer-session`** - Session token workflows and project claiming guidance
- **`analyze-project-structure`** - Intelligent project analysis with deployment recommendations

#### 🤖 Enhanced AI Agent System
- **Agent Detection Service**: Modular detection for Claude, Cursor, Windsurf, VS Code Copilot
- **Analytics Service**: Internal usage tracking and optimization insights
- **Capability-Based Optimization**: Dynamic tool selection based on agent capabilities
- **Tool Categorization**: Organized tools by PRIMARY, GENERATORS, DEPLOYMENT, ANALYSIS

### Enhanced

#### 🔧 Tool System Improvements
- **Zod Schema Validation**: All tools use proper `z.object()` schemas with type safety
- **Enhanced Error Handling**: Comprehensive validation with descriptive error messages
- **Agent Context Integration**: Tools automatically include agent metadata for optimization
- **Registry Pattern**: Centralized tool registration following MCP SDK patterns

#### 📁 New File Structure
```
nexlayer-mcp/
├── index.ts                 # Clean 32-line entry point
├── src/
│   ├── server.ts           # Main MCP server class
│   ├── agent/
│   │   ├── detection.ts    # AI agent detection service
│   │   └── analytics.ts    # Internal usage analytics
│   ├── tools/
│   │   ├── registry.ts     # Tool registration system
│   │   ├── categories.ts   # Dynamic tool categorization
│   │   └── deployment.ts   # Deployment tools module
│   └── prompts/
│       └── nexlayer-deployment.ts # Comprehensive prompt system
├── services/               # Existing services (unchanged)
├── types/                  # Existing types (unchanged)
```

### Technical Improvements

#### 📊 Code Statistics (Version 1.3.0)
- **Architecture**: Modular design with proper separation of concerns
- **Code Quality**: TypeScript strict mode with comprehensive type safety
- **Lines**: Reduced from 1400+ monolithic lines to organized modules
- **SDK Compliance**: 100% following MCP TypeScript SDK patterns

#### 🏗️ Architecture Benefits
- **Maintainable**: Clear module boundaries, easy to understand and extend
- **Testable**: Each component can be tested in isolation
- **Scalable**: Easy to add new tools, prompts, and features
- **Standards-Compliant**: Following official MCP TypeScript SDK documentation
- **AI-Optimized**: Built-in agent detection and capability-based optimization

### Migration and Compatibility

#### ⚠️ Breaking Changes
- **File Structure**: Moved from single index.ts to modular src/ structure
- **Build Output**: Compiled structure changed to match new organization
- **Import Paths**: Internal imports updated to use new module structure

#### ✅ Backward Compatibility Maintained
- **All Tools Available**: Every existing tool preserved with enhanced functionality
- **API Contracts**: Tool interfaces remain identical for external users
- **Deployment Workflows**: All deployment scenarios continue to work
- **Configuration**: Existing Claude Desktop configurations remain valid

#### 🔄 Migration Benefits
- **Better Performance**: Optimized loading and execution
- **Enhanced Debugging**: Clear error messages and validation
- **Improved Reliability**: Comprehensive input validation prevents runtime errors
- **Future-Proof**: Architecture ready for additional MCP features

### Benefits for Different Environments

#### 🤖 For AI Agents
- **Structured Prompts**: Type-safe argument validation for reliable automation
- **Decision Trees**: Clear workflow guidance reduces trial-and-error
- **Capability Detection**: Automatic optimization based on agent type
- **Enhanced Communication**: Proper message formatting for better understanding

#### 👨‍💻 For Developers
- **Clean Codebase**: Modular architecture easy to understand and maintain
- **Type Safety**: Comprehensive validation prevents common errors
- **Better Documentation**: Self-documenting prompt system
- **SDK Compliance**: Following industry best practices

#### 🏢 For Production Use
- **Reliability**: Enhanced error handling and validation
- **Monitoring**: Built-in analytics for usage insights
- **Scalability**: Architecture supports growing feature requirements
- **Standards**: Compliance with MCP TypeScript SDK ensures long-term support

---

## [1.2.0] - 2025-07-10

### Added

#### 🤖 Enhanced AI Agent Discoverability
- **Tool Categorization System** - Organized tools into PRIMARY, GENERATORS, DEPLOYMENT, and ANALYSIS categories
- **Emoji Indicators** - Added visual cues: 🚀 RECOMMENDED, ⚡ QUICK START, 🏗️ SCAFFOLD for better tool selection
- **Usage Examples** - Added real-world usage examples for each tool to guide AI agents
- **Enhanced Input Schemas** - Detailed property descriptions, defaults, and validation for all tools
- **Quick Deployment Scenarios** - Pre-configured deployment patterns for common use cases

#### 🎯 New Deployment Workflow Prompts (2 prompts)
- **`nexlayer-deployment-guide`** - Comprehensive AI agent guide with decision trees and tool selection logic
- **`nexlayer-quick-deploy`** - Fast deployment scenarios for existing projects, new React apps, full-stack apps, demos, and production

### Enhanced

#### 🔧 Optimized Tool Interfaces
- **`smart-deploy`** - Enhanced with 🚀 RECOMMENDED indicator and detailed schema
- **`deploy-react-hello-world`** - Added ⚡ QUICK START indicator for fast React deployment
- **`generate-full-stack-project`** - Added 🏗️ SCAFFOLD indicator for complete project generation
- **All tools** - Enhanced with comprehensive input schemas, defaults, and usage guidance

#### 📚 AI Agent Guidance System
- **Decision Tree Logic** - Clear pathways for AI agents to select optimal tools
- **Tool Selection Patterns** - Documented best practices for different deployment scenarios
- **Workflow Documentation** - Step-by-step deployment processes with error handling
- **Session Management Guidance** - Complete anonymous → authenticated deployment workflows

### Technical Improvements

#### 📊 Code Statistics (Version 1.2.0)
- **Files changed**: 1 (`index.ts`)
- **Lines added**: +307
- **Lines modified**: 6 (enhanced tool registrations)
- **New constants**: Tool categorization and usage examples system

#### 🏗️ Architecture Enhancements
- **Tool Discovery System** - Improved categorization for better AI agent tool selection
- **Schema-Driven Interfaces** - All tools now have comprehensive input validation
- **Usage Pattern Recognition** - AI agents can better match user requests to appropriate tools
- **Workflow Optimization** - Streamlined deployment processes with clear guidance

### Benefits for AI Agents

#### 🎯 Improved Tool Selection
- **Clear Categories** - Easily identify the right tool category for any deployment task
- **Visual Indicators** - Emoji-based priority system guides optimal tool selection
- **Usage Context** - Real-world examples help match user requests to tools
- **Decision Support** - Comprehensive workflow guides reduce trial-and-error

#### ⚡ Faster Deployment
- **Quick Start Paths** - Predefined scenarios for common deployment patterns
- **Smart Defaults** - Reduced configuration overhead with intelligent defaults
- **Error Prevention** - Better input validation prevents common deployment failures
- **Workflow Guidance** - Step-by-step processes ensure successful deployments

### Migration and Compatibility

#### ✅ Full Backward Compatibility
- All existing tool interfaces remain unchanged
- Existing configurations continue to work without modification
- New features are additive and optional
- No breaking changes to API or behavior

#### 🆕 New Capabilities Available
- Enhanced tool discovery through categorization
- Improved deployment success rates with better guidance
- Faster AI agent task completion with optimized workflows
- Better user experience through intelligent tool recommendations

---

## [1.1.0] - 2025-07-10

### Added

#### 🚀 New MCP Tools (3 tools)
- **`get-nexlayer-schema`** - Fetches the latest Nexlayer schema for validation
  - Retrieves current deployment schema from Nexlayer API
  - Returns formatted JSON schema for AI agents to use
  - Enables schema-driven YAML generation and validation
  
- **`detect-env-and-secrets`** - Automatic environment detection and analysis
  - Scans `.env`, `.env.local`, `.env.example`, `.env.production` files
  - Analyzes `package.json` dependencies for service detection
  - Automatically categorizes environment variables vs secrets
  - Detects managed services: Supabase, Auth0, OpenAI, Database services
  - Provides intelligent recommendations for missing configuration
  - Returns structured analysis with actionable suggestions

#### 🤖 Natural Language Deployment Prompts (3 prompts)
- **`deploy-fullstack-app`** - Comprehensive deployment orchestrator
  - Natural language interface for any full-stack application deployment
  - Supports project descriptions like "Next.js blog with Postgres"
  - Handles session token capture workflow for anonymous deployments
  - Integrates with all existing MCP tools for seamless deployment
  - Provides step-by-step deployment guidance and constraints

- **`manage-nexlayer-session`** - Session token management assistant
  - Guides users through Nexlayer session workflows
  - Supports actions: get-token, save-token, claim-project, list-projects
  - Explains anonymous deployment → token capture → project claiming flow
  - Provides guidance for accessing app.nexlayer.io for project management

- **`analyze-project-structure`** - Project analysis and recommendations
  - Analyzes project structure to recommend optimal deployment strategies
  - Supports multiple analysis types: full, framework-only, dependencies-only, deployment-ready
  - Provides framework detection and MCP tool recommendations
  - Helps users understand the best deployment approach for their projects

### Enhanced

#### 🔧 Improved Existing Tools
- **`generate-nexlayer-yaml`** - Major enhancements
  - **Schema validation integration**: Automatically fetches and validates against latest Nexlayer schema
  - **Environment variables support**: Accepts `envVars` parameter for automatic injection
  - **Secrets support**: Accepts `secrets` parameter for secure configuration
  - **Real-time validation**: Shows validation results with ✅/❌ indicators
  - **Enhanced error handling**: Graceful fallback when schema unavailable

#### 📦 Core Infrastructure
- **Zod integration**: Added `import { z } from "zod"` for robust schema validation in prompts
- **TypeScript improvements**: Enhanced type safety for new tool parameters
- **Error handling**: Improved error messages and fallback behaviors

### Technical Details

#### 📊 Code Statistics
- **Files changed**: 1 (`index.ts`)
- **Lines added**: +437
- **Lines modified**: 5 (existing tool signatures)
- **New dependencies**: Zod integration for schema validation

#### 🏗️ Architecture Improvements
- **Schema-driven workflow**: Complete integration between schema fetching, validation, and YAML generation
- **Environment detection pipeline**: Automated scanning → analysis → recommendations → injection
- **Natural language interface**: AI agents can now use conversational prompts for deployment
- **Session management**: Complete workflow from anonymous deployment to project claiming

#### 🔍 Environment Detection Capabilities
- **File scanning**: `.env*` files with intelligent parsing
- **Dependency analysis**: `package.json` scanning for service detection
- **Service recognition**: 
  - Supabase (`@supabase/supabase-js`, `SUPABASE_*` variables)
  - Auth0 (`@auth0/*`, `auth0`, `AUTH0_*` variables)
  - OpenAI (`openai`, `OPENAI_API_KEY` variables)
  - Databases (`prisma`, `mongoose`, `pg`, `DATABASE_URL`)
- **Smart categorization**: Automatic separation of public env vars vs secrets
- **Recommendations engine**: Suggests missing configuration based on detected services

#### 🎯 Deployment Workflow Integration
1. **Project Analysis**: `detect-env-and-secrets` scans project structure
2. **Schema Validation**: `get-nexlayer-schema` fetches latest validation rules
3. **YAML Generation**: Enhanced `generate-nexlayer-yaml` creates validated configuration
4. **Deployment**: Existing tools handle Docker build, push, and Nexlayer deployment
5. **Session Management**: Prompts guide through token capture and project claiming

### Benefits

#### 🤖 For AI Agents
- **Natural language deployment**: Describe apps in plain English, get full deployment
- **Autonomous environment detection**: No manual configuration needed for common services
- **Schema-aware generation**: Always produces valid, up-to-date YAML configurations
- **Intelligent recommendations**: Proactive suggestions for missing configuration

#### 👨‍💻 For Developers
- **Reduced configuration overhead**: Automatic detection of environment needs
- **Always-current schemas**: YAML validation against latest Nexlayer specifications
- **Session workflow clarity**: Clear guidance through anonymous → claimed deployment
- **Comprehensive tooling**: Complete deployment pipeline in one MCP server

#### 🏢 For Teams
- **Consistent deployments**: Schema validation ensures conformance across team
- **Self-documenting**: Natural language prompts serve as deployment documentation
- **Onboarding friendly**: New team members can deploy with minimal configuration knowledge

### Migration Notes

#### ✅ Backward Compatibility
- All existing tools remain unchanged and fully functional
- Existing Claude Desktop configurations continue to work
- No breaking changes to API interfaces

#### 🔄 New Capabilities Available
- Restart Claude Desktop to access new prompts and tools
- Use `deploy-fullstack-app` prompt for natural language deployment
- Try `detect-env-and-secrets` on existing projects for automatic configuration discovery

---

## [1.0.0] - 2025-07-09

### Added
- Initial MCP server implementation
- Core deployment tools (9 tools total)
- Nexlayer API integration
- Docker build and push capabilities
- File generation utilities
- Smart deployment pipeline
- Basic YAML generation
- React Hello World templates

### Infrastructure
- TypeScript implementation
- MCP SDK integration
- Nexlayer API client
- File generation services
- Claude Desktop configuration support