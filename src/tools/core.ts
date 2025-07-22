/**
 * Core Nexlayer Tools
 * Simplified tools that directly map to the Nexlayer API
 */

import { z } from "zod";
import { ToolRegistry } from './registry.js';
import { NexlayerApiClient } from '../../services/nexlayer-api.js';

export class CoreTools {
  private registry: ToolRegistry;
  private getClient: (sessionToken?: string) => NexlayerApiClient;
  private logger;
  private tracer;

  constructor(registry: ToolRegistry, getClient: (sessionToken?: string) => NexlayerApiClient) {
    this.registry = registry;
    this.getClient = getClient;
    this.logger = registry.getLoggerFactory().deploy;
    this.tracer = registry.getTracer();
    this.registerTools();
  }

  private registerTools(): void {
    this.registerDeployWorkflow(); // 🎯 NEW: Complete 6-step workflow orchestrator
    this.registerDeploy();
    this.registerExtendDeployment();
    this.registerClaimDeployment();
    this.registerGetSchema();
    this.registerAddReservation();
    this.registerRemoveReservation();
    this.registerGetReservations();
    this.registerFeedback();
  }

  /**
   * Universal deployment tool - handles all deployment scenarios
   * Maps directly to /startUserDeployment API endpoint
   */
  private registerDeploy(): void {
    this.registry.registerTool(
      "nexlayer_deploy",
      {
        title: "Deploy to Nexlayer (Step 6)",
        description: "FINAL STEP: Deploy prepared YAML configuration to Nexlayer platform. Accepts any valid container images (ttl.sh, ghcr.io, docker.io, etc). Only use after completing steps 1-5: clone, analyze, dockerfile, build, yaml generation.",
        inputSchema: {
          yamlContent: z.string().describe("Complete Nexlayer YAML configuration with container image URLs (any registry: ttl.sh, ghcr.io, docker.io, etc)"),
          sessionToken: z.string().optional().describe("Optional Nexlayer session token for authenticated deployment")
        }
      },
      async (params) => {
        // Initialize deployment trace
        const { DeploymentTraceManager } = await import('../utils/deployment-trace.js');
        const sessionId = params.sessionToken?.slice(0, 16) || DeploymentTraceManager.generateSessionId();
        const trace = this.tracer.startTrace(sessionId, undefined, {
          userId: 'mcp-user',
          clientType: 'nexlayer-mcp',
          mcpVersion: '1.0.0'
        });

        this.logger.info('Deployment started', {
          sessionId,
          appName: params.appName,
          autoGenerate: params.autoGenerate,
          hasYamlContent: !!params.yamlContent,
          hasFilePath: !!params.filePath
        });

        this.tracer.addStep(sessionId, 'nexlayer_deploy', 'in_progress', {
          message: 'Starting deployment process'
        });

        try {
          const client = this.getClient(params.sessionToken);
          const yamlContent = params.yamlContent;
          
          // Validate that YAML content is provided
          if (!yamlContent || yamlContent.trim() === '') {
            this.logger.error('No YAML content provided', { sessionId });
            this.tracer.updateStep(sessionId, 'nexlayer_deploy', {
              status: 'failed',
              error: 'No YAML content provided'
            });
            this.tracer.completeTrace(sessionId, 'failed');

            return {
              content: [{
                type: "text",
                text: `❌ **Missing YAML Configuration**\n\n**nexlayer_deploy requires prepared YAML content!**\n\n**📋 Complete These Steps First:**\n1. 📥 \`nexlayer_clone_repo\` - Clone repository\n2. 🔍 \`nexlayer_analyze_repository\` - Analyze project\n3. 🐳 \`nexlayer_generate_intelligent_dockerfile\` - Generate Dockerfiles\n4. 🏗️ \`nexlayer_build_images\` - Build and push to ttl.sh\n5. 📝 \`nexlayer_generate_intelligent_yaml\` - Generate YAML config\n6. 🚀 \`nexlayer_deploy\` - Deploy with generated YAML\n\n**🎯 Or use:** \`nexlayer_complete_deployment\` to run the full workflow automatically.`
              }]
            };
          }
          
          // Log deployment attempt for debugging
          this.logger.info('Processing YAML deployment', { 
            sessionId, 
            hasImageReferences: !!(yamlContent.match(/image:\s*[^\s]+/g)),
            yamlLength: yamlContent.length 
          });
          
          // Deploy to Nexlayer platform
          this.logger.info('Deploying YAML to Nexlayer platform', { sessionId });
          const result = await client.startUserDeployment({ 
            yamlContent, 
            sessionToken: params.sessionToken 
          });
          
          this.logger.info('Deployment completed successfully', {
            sessionId,
            applicationName: result.applicationName,
            url: result.url,
            status: result.status?.environment
          });

          this.tracer.updateStep(sessionId, 'nexlayer_deploy', {
            status: 'success',
            message: `Deployed ${result.applicationName}`,
            data: {
              applicationName: result.applicationName,
              url: result.url,
              status: result.status?.environment
            }
          });
          this.tracer.completeTrace(sessionId, 'success', result.applicationName);
          
          // Return both human-readable summary AND structured data for Claude
          const structuredData = {
            deployment: {
              applicationName: result.applicationName,
              url: result.url,
              status: result.status?.environment || 'deploying',
              sessionToken: result.sessionToken,
              deploymentId: (result as any).deploymentId || result.applicationName
            },
            infrastructure: {
              environment: result.status?.environment,
              services: (result as any).services || [],
              resources: (result as any).resources || {},
              networking: (result as any).networking || {}
            },
            management: {
              extend: result.extend || null,
              claim: result.claim || null,
              info: result.info || null
            },
            timestamps: {
              created: new Date().toISOString(),
              expires: (result.extend as any)?.expiresAt || null
            }
          };

          return {
            content: [
              {
                type: "text", 
                text: `🎉 **Deployment Successful!**\n\n**✅ Step 6 Complete - Application Live!**\n\n**Application:** ${result.applicationName}\n**Live URL:** ${result.url}\n**Status:** ${result.status?.environment || 'Deploying...'}\n\n${!params.sessionToken && result.sessionToken ? `🔑 **Session Token:** ${result.sessionToken}\n💾 Save this token to manage your deployment\n\n` : ''}${result.extend?.message ? `**Extend:** ${result.extend.message}\n` : ''}${result.claim?.message ? `**Claim:** ${result.claim.message}\n` : ''}${result.info ? `**Info:** ${result.info}` : ''}\n\n🚀 **Congratulations!** Your application is now running on Nexlayer!`
              },
              {
                type: "text",
                text: `**📊 Deployment Details:**\n\`\`\`json\n${JSON.stringify(structuredData, null, 2)}\n\`\`\`\n\n**🛠️ Management Options:**\n- **Extend:** Use \`nexlayer_extend_deployment\` to extend runtime\n- **Claim:** Use \`nexlayer_claim_deployment\` to take ownership\n- **Monitor:** Visit ${result.url} to see your live application`
              }
            ]
          };
        } catch (error: any) {
          this.logger.error('Deployment failed', {
            sessionId,
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 3)
          });

          this.tracer.updateStep(sessionId, 'nexlayer_deploy', {
            status: 'failed',
            error: error.message,
            data: { errorType: error.constructor.name }
          });
          this.tracer.completeTrace(sessionId, 'failed');

          // Enhanced error reporting with deployment-time validation insights
          const isValidationError = error.message.includes('Invalid YAML') || 
                                   error.message.includes('Missing application') ||
                                   error.message.includes('validation');
          
          const errorAdvice = isValidationError 
            ? `\n\n🎯 **Deployment Validation Insights:**\nThe Nexlayer platform identified issues during deployment:\n- ${error.message}\n\n**Next Steps:**\n1. Review the YAML structure against Nexlayer schema\n2. Ensure ttl.sh image URLs are accessible\n3. Verify all required fields are present\n4. Use \`nexlayer_get_schema\` to check latest requirements`
            : `\n\n💡 **Troubleshooting:**\n- Check if ttl.sh images are accessible\n- Verify servicePorts match your application\n- Ensure application name is valid (lowercase, alphanumeric, hyphens)\n- Review logs for network or resource issues`;

          return {
            content: [{
              type: "text",
              text: `❌ **Deployment Failed**\n\n**Error:** ${error.message}\n**Session ID:** ${sessionId}${errorAdvice}\n\n🔍 **Debug:** Use \`nexlayer_get_deployment_trace\` with session ID \`${sessionId}\` for detailed error analysis.`
            }]
          };
        }
      }
    );
  }

  /**
   * Auto-generate YAML from project analysis
   */
  private async generateYamlFromProject(projectPath: string, appName?: string): Promise<string> {
    // This would use the existing analysis logic but simplified
    const analysis = await this.analyzeProject(projectPath);
    const finalAppName = appName || analysis.suggestedName || 'my-app';
    
    // Generate Nexlayer-specific YAML format with required fields
    const config = {
      application: {
        name: finalAppName,
        pods: [{
          name: finalAppName,
          image: analysis.suggestedImage || 'nginx:latest',
          path: '/', // Required field for Nexlayer routing
          servicePorts: [analysis.port || 3000],
          ...(Object.keys(analysis.envVars || {}).length > 0 && { vars: analysis.envVars })
        }]
      }
    };
    
    const yaml = await import('yaml');
    return yaml.stringify(config);
  }

  /**
   * Simplified project analysis
   */
  private async analyzeProject(projectPath: string) {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const result = {
      suggestedName: 'my-app',
      suggestedImage: 'nginx:latest',
      port: 3000,
      envVars: {} as Record<string, string>
    };

    try {
      // Check package.json
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      result.suggestedName = packageJson.name?.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase() || 'my-app';
      
      // Enhanced framework detection for Nexlayer
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps.next) {
        // Next.js apps need Node.js runtime
        result.suggestedImage = 'node:18-alpine';
        result.port = 3000;
        // Add Next.js specific environment variables
        result.envVars.NODE_ENV = 'production';
        result.envVars.PORT = '3000';
      } else if (deps.react && (deps['react-scripts'] || deps.vite)) {
        // Create React App or Vite - static build served by nginx
        result.suggestedImage = 'nginx:alpine';
        result.port = 80;
      } else if (deps.express || deps.fastify || deps.koa) {
        // Node.js server frameworks
        result.suggestedImage = 'node:18-alpine';
        result.port = deps.express ? 8000 : 3000;
        result.envVars.NODE_ENV = 'production';
      } else if (deps.typescript && !deps.react && !deps.next) {
        // Generic TypeScript project
        result.suggestedImage = 'node:18-alpine';
        result.port = 3000;
        result.envVars.NODE_ENV = 'production';
      }
    } catch {
      // Use defaults
    }

    return result;
  }

  /**
   * Extend an existing deployment
   * Maps to /extendDeployment API endpoint
   */
  private registerExtendDeployment(): void {
    this.registry.registerTool(
      "nexlayer_extend_deployment",
      {
        title: "Extend Deployment",
        description: "Extend an existing Nexlayer deployment using session token to prevent expiration",
        inputSchema: {
          sessionToken: z.string().describe("Session token from the original deployment"),
          applicationName: z.string().describe("Name of the application to extend")
        }
      },
      async (params) => {
        const sessionId = params.sessionToken?.slice(0, 16) || 'extend-session';
        
        this.logger.info('Extending deployment', {
          sessionId,
          applicationName: params.applicationName
        });

        try {
          const client = this.getClient(params.sessionToken);
          const result = await client.extendDeployment({
            sessionToken: params.sessionToken,
            applicationName: params.applicationName
          });

          this.logger.info('Deployment extended successfully', {
            sessionId,
            applicationName: params.applicationName,
            newExpiration: (result as any).expiresAt
          });

          return {
            content: [{
              type: "text",
              text: `✅ **Deployment Extended Successfully**\n\n**Application:** ${params.applicationName}\n**Session Token:** ${params.sessionToken}\n\n${result.extend?.message || 'Deployment extended successfully'}\n\n${(result as any).expiresAt ? `**New Expiration:** ${(result as any).expiresAt}\n` : ''}💡 **Your deployment will remain active for the extended period.**`
            }]
          };
        } catch (error: any) {
          this.logger.error('Failed to extend deployment', {
            sessionId,
            applicationName: params.applicationName,
            error: error.message
          });

          return {
            content: [{
              type: "text", 
              text: `❌ **Failed to Extend Deployment**\n\n**Error:** ${error.message}\n\n💡 **Troubleshooting:**\n- Verify the session token is correct and not expired\n- Ensure the application name matches exactly\n- Check that the deployment still exists on Nexlayer platform`
            }]
          };
        }
      }
    );
  }

  /**
   * Claim an existing deployment 
   * Maps to /claimDeployment API endpoint
   */
  private registerClaimDeployment(): void {
    this.registry.registerTool(
      "nexlayer_claim_deployment",
      {
        title: "Claim Deployment",
        description: "Claim an existing Nexlayer deployment using session token to take ownership",
        inputSchema: {
          sessionToken: z.string().describe("Session token from the deployment"),
          applicationName: z.string().describe("Name of the application to claim")
        }
      },
      async (params) => {
        const sessionId = params.sessionToken?.slice(0, 16) || 'claim-session';
        
        this.logger.info('Claiming deployment', {
          sessionId,
          applicationName: params.applicationName
        });

        try {
          const client = this.getClient(params.sessionToken);
          const result = await client.claimDeployment({
            sessionToken: params.sessionToken,
            applicationName: params.applicationName
          });

          this.logger.info('Deployment claimed successfully', {
            sessionId,
            applicationName: params.applicationName
          });

          return {
            content: [{
              type: "text",
              text: `✅ **Deployment Claimed Successfully**\n\n**Application:** ${params.applicationName}\n**Session Token:** ${params.sessionToken}\n\n${result.claim?.message || 'Deployment claimed successfully'}\n\n🎉 **You now have full control over this deployment.**\n\n💡 **Next Steps:**\n- Use \`nexlayer_extend_deployment\` to extend the deployment duration\n- Monitor your application at: ${result.url || 'Check Nexlayer dashboard'}`
            }]
          };
        } catch (error: any) {
          this.logger.error('Failed to claim deployment', {
            sessionId,
            applicationName: params.applicationName,
            error: error.message
          });

          return {
            content: [{
              type: "text",
              text: `❌ **Failed to Claim Deployment**\n\n**Error:** ${error.message}\n\n💡 **Troubleshooting:**\n- Verify the session token is correct and valid\n- Ensure the application name matches exactly\n- Check that the deployment exists and is claimable\n- Make sure you have permission to claim this deployment`
            }]
          };
        }
      }
    );
  }

  /**
   * Get Nexlayer YAML schema
   * Maps to GET /schema API endpoint
   */
  private registerGetSchema(): void {
    this.registry.registerTool(
      "nexlayer_get_schema",
      {
        title: "Get Schema",
        description: "Get the current Nexlayer YAML schema to understand configuration requirements and validation rules",
        inputSchema: {}
      },
      async () => {
        const sessionId = 'schema-request';
        
        this.logger.info('Fetching Nexlayer schema', { sessionId });

        try {
          const client = this.getClient();
          const schema = await client.getSchema();

          this.logger.info('Schema fetched successfully', {
            sessionId,
            schemaVersion: (schema as any).version,
            hasValidation: !!(schema as any).validation
          });

          // Parse Nexlayer schema (JSON Schema format)
          const schemaData = typeof schema === 'string' ? JSON.parse(schema) : schema;
          const title = schemaData.title || 'Nexlayer YAML Schema';
          const description = schemaData.description || 'Schema for Nexlayer deployments';
          
          // Convert JSON Schema to human-readable YAML format for LLMs
          const yamlExample = await this.generateYamlExampleFromSchema(schemaData);
          const schemaJson = JSON.stringify(schemaData, null, 2);

          return {
            content: [{
              type: "text",
              text: `📋 **${title}**\n\n**Description:** ${description}\n\n🎯 **NEXLAYER YAML FORMAT (Not Generic JSON):**\n\`\`\`yaml\n${yamlExample}\n\`\`\`\n\n📝 **Required Fields:**\n${this.extractRequiredFields(schemaData)}\n\n💡 **This is Nexlayer-specific YAML format** - use this structure when calling \`nexlayer_generate_intelligent_yaml\` or \`nexlayer_deploy\``
            }, {
              type: "text",
              text: `**🔍 Complete JSON Schema for Validation:**\n\`\`\`json\n${schemaJson}\n\`\`\`\n\n**⚠️ Important:** This JSON Schema defines the structure, but you must generate YAML format for Nexlayer deployments.`
            }]
          };
        } catch (error: any) {
          this.logger.error('Failed to fetch schema', {
            sessionId,
            error: error.message
          });

          return {
            content: [{
              type: "text",
              text: `❌ **Failed to Fetch Schema**\n\n**Error:** ${error.message}\n\n💡 **Troubleshooting:**\n- Check network connectivity to Nexlayer API\n- Verify API endpoint is accessible\n- Try again in a moment if this is a temporary issue`
            }]
          };
        }
      }
    );
  }

  /**
   * Add deployment reservation
   * Maps to POST /addDeploymentReservation API endpoint
   */
  private registerAddReservation(): void {
    this.registry.registerTool(
      "nexlayer_add_deployment_reservation",
      {
        title: "Add Deployment Reservation",
        description: "Add a deployment reservation to prevent conflicts and ensure resource availability",
        inputSchema: {
          sessionToken: z.string().describe("Session token from authenticated deployment"),
          applicationName: z.string().describe("Name of the application to reserve")
        }
      },
      async (params) => {
        const sessionId = params.sessionToken?.slice(0, 16) || 'reserve-session';
        
        this.logger.info('Adding deployment reservation', {
          sessionId,
          applicationName: params.applicationName
        });

        try {
          const client = this.getClient(params.sessionToken);
          await client.addDeploymentReservation({
            sessionToken: params.sessionToken,
            applicationName: params.applicationName
          });

          this.logger.info('Deployment reservation added successfully', {
            sessionId,
            applicationName: params.applicationName
          });

          return {
            content: [{
              type: "text",
              text: `✅ **Deployment Reservation Added**\n\n**Application:** ${params.applicationName}\n**Session Token:** ${params.sessionToken}\n\n🔒 **This application name is now reserved and protected from conflicts.**\n\n💡 **Next Steps:**\n- Deploy your application using the reserved name\n- Use \`nexlayer_get_reservations\` to view all your reservations\n- Use \`nexlayer_remove_deployment_reservation\` when no longer needed`
            }]
          };
        } catch (error: any) {
          this.logger.error('Failed to add deployment reservation', {
            sessionId,
            applicationName: params.applicationName,
            error: error.message
          });

          return {
            content: [{
              type: "text",
              text: `❌ **Failed to Add Deployment Reservation**\n\n**Error:** ${error.message}\n\n💡 **Troubleshooting:**\n- Verify the session token is valid and not expired\n- Ensure the application name is available for reservation\n- Check that you have permission to create reservations\n- Application names must be lowercase, alphanumeric, and may contain hyphens`
            }]
          };
        }
      }
    );
  }

  /**
   * Remove deployment reservation
   * Maps to POST /removeDeploymentReservation API endpoint
   */
  private registerRemoveReservation(): void {
    this.registry.registerTool(
      "nexlayer_remove_deployment_reservation",
      {
        title: "Remove Deployment Reservation",
        description: "Remove a deployment reservation to free up the application name for others",
        inputSchema: {
          sessionToken: z.string().describe("Session token from authenticated deployment"),
          applicationName: z.string().describe("Name of the application reservation to remove")
        }
      },
      async (params) => {
        const sessionId = params.sessionToken?.slice(0, 16) || 'remove-session';
        
        this.logger.info('Removing deployment reservation', {
          sessionId,
          applicationName: params.applicationName
        });

        try {
          const client = this.getClient(params.sessionToken);
          await client.removeDeploymentReservation({
            sessionToken: params.sessionToken,
            applicationName: params.applicationName
          });

          this.logger.info('Deployment reservation removed successfully', {
            sessionId,
            applicationName: params.applicationName
          });

          return {
            content: [{
              type: "text",
              text: `✅ **Deployment Reservation Removed**\n\n**Application:** ${params.applicationName}\n**Session Token:** ${params.sessionToken}\n\n🔓 **This application name is now available for others to use.**\n\n💡 **The reservation has been successfully released from your account.**`
            }]
          };
        } catch (error: any) {
          this.logger.error('Failed to remove deployment reservation', {
            sessionId,
            applicationName: params.applicationName,
            error: error.message
          });

          return {
            content: [{
              type: "text",
              text: `❌ **Failed to Remove Deployment Reservation**\n\n**Error:** ${error.message}\n\n💡 **Troubleshooting:**\n- Verify the session token is valid and not expired\n- Ensure the application name matches exactly\n- Check that you own this reservation\n- Use \`nexlayer_get_reservations\` to verify reservation exists`
            }]
          };
        }
      }
    );
  }

  /**
   * Get all deployment reservations
   * Maps to GET /getReservations API endpoint
   */
  private registerGetReservations(): void {
    this.registry.registerTool(
      "nexlayer_get_reservations",
      {
        title: "Get Reservations",
        description: "Get all deployment reservations for your session to see what application names you have reserved",
        inputSchema: {
          sessionToken: z.string().describe("Session token from authenticated deployment")
        }
      },
      async (params) => {
        const sessionId = params.sessionToken?.slice(0, 16) || 'reservations-session';
        
        this.logger.info('Fetching deployment reservations', { sessionId });

        try {
          const client = this.getClient(params.sessionToken);
          const reservations = await client.getReservations({
            sessionToken: params.sessionToken
          });

          this.logger.info('Deployment reservations fetched successfully', {
            sessionId,
            reservationCount: reservations.length
          });

          if (reservations.length === 0) {
            return {
              content: [{
                type: "text",
                text: `📝 **No Active Reservations**\n\n**Session Token:** ${params.sessionToken}\n\n🆓 **You don't currently have any deployment reservations.**\n\n💡 **To create a reservation:**\n- Use \`nexlayer_add_deployment_reservation\` with an application name\n- This will protect the name from conflicts during deployment`
              }]
            };
          }

          const reservationsList = reservations.map((res, index) => 
            `${index + 1}. **${res.applicationName || 'Unknown'}**${res.createdAt ? ` (Created: ${new Date(res.createdAt).toLocaleString()})` : ''}${res.expiresAt ? ` (Expires: ${new Date(res.expiresAt).toLocaleString()})` : ''}`
          ).join('\n');

          return {
            content: [{
              type: "text",
              text: `📝 **Active Deployment Reservations**\n\n**Session Token:** ${params.sessionToken}\n**Total Reservations:** ${reservations.length}\n\n${reservationsList}\n\n💡 **Management:**\n- Use \`nexlayer_remove_deployment_reservation\` to release unused reservations\n- Use \`nexlayer_add_deployment_reservation\` to create new reservations\n\n🔒 **Reserved names are protected from conflicts during deployment.**`
            }]
          };
        } catch (error: any) {
          this.logger.error('Failed to fetch deployment reservations', {
            sessionId,
            error: error.message
          });

          return {
            content: [{
              type: "text",
              text: `❌ **Failed to Fetch Reservations**\n\n**Error:** ${error.message}\n\n💡 **Troubleshooting:**\n- Verify the session token is valid and not expired\n- Check network connectivity to Nexlayer API\n- Ensure you have permission to view reservations`
            }]
          };
        }
      }
    );
  }

  /**
   * Send feedback to Nexlayer team
   * Maps to POST /feedback API endpoint
   */
  private registerFeedback(): void {
    this.registry.registerTool(
      "nexlayer_feedback",
      {
        title: "Send Feedback",
        description: "Send feedback, bug reports, or feature requests directly to the Nexlayer team",
        inputSchema: {
          feedback: z.string().min(10).describe("Your feedback, bug report, or feature request (minimum 10 characters)")
        }
      },
      async (params) => {
        const sessionId = 'feedback-session';
        
        this.logger.info('Sending feedback to Nexlayer team', {
          sessionId,
          feedbackLength: params.feedback.length
        });

        try {
          const client = this.getClient();
          await client.sendFeedback(params.feedback);

          this.logger.info('Feedback sent successfully', { sessionId });

          return {
            content: [{
              type: "text",
              text: `📧 **Feedback Sent Successfully**\n\n**Your Message:**\n> ${params.feedback}\n\n✅ **Thank you for your feedback!**\n\nThe Nexlayer team will review your message and may reach out if they need additional information.\n\n💡 **Your input helps make Nexlayer better for everyone.**`
            }]
          };
        } catch (error: any) {
          this.logger.error('Failed to send feedback', {
            sessionId,
            error: error.message
          });

          return {
            content: [{
              type: "text",
              text: `❌ **Failed to Send Feedback**\n\n**Error:** ${error.message}\n\n💡 **Alternative Options:**\n- Try again in a moment if this is a temporary issue\n- Contact Nexlayer support through their website\n- Check network connectivity and try again`
            }]
          };
        }
      }
    );
  }

  /**
   * Complete 6-step deployment workflow orchestrator
   * Guides LLMs through proper deployment process
   */
  private registerDeployWorkflow(): void {
    this.registry.registerTool(
      "nexlayer_complete_deployment",
      {
        title: "Complete Deployment Workflow",
        description: "Execute the full 6-step Nexlayer deployment process: Clone → Analyze → Generate → Build → Configure → Deploy. Works with any container registry (ttl.sh, ghcr.io, docker.io, etc). Use this instead of individual tools for new deployments.",
        inputSchema: {
          repositoryUrl: z.string().url().describe("GitHub repository URL (https://github.com/user/repo)"),
          appName: z.string().optional().describe("Custom application name (auto-detected if not provided)"),
          skipBuild: z.boolean().optional().default(false).describe("Skip Docker build step (use existing images)")
        }
      },
      async (params) => {
        const workflowId = 'workflow-' + Date.now();
        this.logger.info('Starting complete deployment workflow', { workflowId, repositoryUrl: params.repositoryUrl });

        const steps = [
          { step: 1, name: 'Clone Repository', tool: 'nexlayer_clone_repo' },
          { step: 2, name: 'Analyze Project', tool: 'nexlayer_analyze_repository' },
          { step: 3, name: 'Generate Dockerfile', tool: 'nexlayer_generate_intelligent_dockerfile' },
          { step: 4, name: 'Build Images', tool: 'nexlayer_build_images' },
          { step: 5, name: 'Generate YAML', tool: 'nexlayer_generate_intelligent_yaml' },
          { step: 6, name: 'Deploy Application', tool: 'nexlayer_deploy' }
        ];

        return {
          content: [{
            type: "text",
            text: `🚀 **Nexlayer Complete Deployment Workflow**\n\n**Repository:** ${params.repositoryUrl}\n**Workflow ID:** ${workflowId}\n\n📋 **Required Steps (Execute in Order):**\n\n${steps.map(s => `**${s.step}. ${s.name}**\n   \`${s.tool}\`${s.step === 1 ? ` with repoUrl: "${params.repositoryUrl}"` : s.step === 6 ? ` with autoGenerate: true` : ''}`).join('\n\n')}\n\n⚡ **Why Follow This Order:**\n- **Steps 1-2:** Repository analysis provides project insights\n- **Steps 3-4:** Dockerfile generation and image building${params.skipBuild ? ' (SKIPPED)' : ''}\n- **Steps 5-6:** YAML generation uses analysis + images for optimal config\n\n🎯 **Expected Result:** Live application URL in ~3-5 minutes\n\n**✅ Next Action:** Execute \`nexlayer_clone_repo\` with the repository URL above.`
          }]
        };
      }
    );
  }

  /**
   * Generate YAML example from JSON Schema for LLM understanding
   */
  private async generateYamlExampleFromSchema(schema: any): Promise<string> {
    try {
      // Create example based on Nexlayer schema structure
      const example = {
        application: {
          name: "my-nextjs-app",
          pods: [{
            name: "web",
            image: "ttl.sh/my-app:1h",  // Emphasize ttl.sh format
            path: "/",  // Required by Nexlayer
            servicePorts: [3000],
            vars: {
              NODE_ENV: "production",
              PORT: "3000"
            }
          }]
        }
      };
      
      // Convert to YAML string
      const yaml = await import('yaml');
      return yaml.stringify(example);
    } catch (error) {
      return `application:
  name: "my-app"
  pods:
    - name: "web"
      image: "ttl.sh/my-app:1h"
      path: "/"
      servicePorts: [3000]`;
    }
  }

  /**
   * Extract and format required fields from JSON Schema
   */
  private extractRequiredFields(schema: any): string {
    try {
      let fields = [];
      
      // Root application is required
      if (schema.required?.includes('application')) {
        fields.push('**application** (root object)');
      }
      
      // Application fields
      const appProps = schema.properties?.application;
      if (appProps?.required) {
        appProps.required.forEach((field: string) => {
          fields.push(`**application.${field}** - ${appProps.properties?.[field]?.description || 'Required field'}`);
        });
      }
      
      // Pod fields
      const podProps = appProps?.properties?.pods?.items?.properties;
      const podRequired = appProps?.properties?.pods?.items?.required || [];
      podRequired.forEach((field: string) => {
        fields.push(`**pods[].${field}** - ${podProps?.[field]?.description || 'Required for each pod'}`);
      });
      
      return fields.join('\n');
    } catch (error) {
      return '**application.name** - Application identifier\n**application.pods** - Array of container definitions\n**pods[].image** - Container image URL (use ttl.sh format)\n**pods[].path** - URL path for routing';
    }
  }
}
