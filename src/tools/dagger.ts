/**
 * Dagger Tools Module
 * Advanced container building and deployment with Dagger integration
 */

import { z } from "zod";
import { ToolRegistry } from './registry.js';
import { NexlayerApiClient } from '../../services/nexlayer-api.js';
import { 
  buildAndPushImages, 
  cloneAndBuild, 
  ensureDaggerBinary,
  cleanupRepo,
  BuildImageResult 
} from '../services/buildAndPushImages.js';
import { existsSync } from 'fs';
import { join } from 'path';

export class DaggerTools {
  private registry: ToolRegistry;
  private getClient: (sessionToken?: string) => NexlayerApiClient;

  constructor(registry: ToolRegistry, getClient: (sessionToken?: string) => NexlayerApiClient) {
    this.registry = registry;
    this.getClient = getClient;
    this.registerTools();
  }

  private registerTools(): void {
    this.registerBuildAndPushImages();
  }


  /**
   * Use Dagger to build and push container images to ttl.sh (Dagger's only responsibility)
   */
  private registerBuildAndPushImages(): void {
    this.registry.registerTool(
      "nexlayer_build_images",
      {
        title: "Dagger Image Builder",
        description: "Build and push container images from MCP-generated Dockerfiles to ttl.sh registry",
        inputSchema: {
          repoPath: z.string().describe("Path to repository with MCP-generated Dockerfiles"),
          verbose: z.boolean().optional().default(false).describe("Enable verbose build logging"),
          timeout: z.number().optional().default(300000).describe("Build timeout in milliseconds (default: 5 minutes)")
        }
      },
      async (params) => {
        try {
          const { repoPath, verbose, timeout } = params;
          
          // Ensure Dagger binary is available
          const binaryCheck = await ensureDaggerBinary(verbose);
          if (!binaryCheck.success) {
            return {
              content: [{
                type: "text",
                text: `❌ **Dagger Binary Not Available**\n\n${binaryCheck.error}\n\n💡 **Setup Required:**\n1. \`cd dagger-runner\`\n2. \`go build -o nexlayer-dagger-runner\`\n3. Ensure Docker is running\n4. Generate Dockerfiles first with \`nexlayer_generate_dockerfile\``
              }]
            };
          }
          
          const buildResult = await buildAndPushImages({ repoPath, verbose, timeout });
          
          if (!buildResult.success) {
            return {
              content: [{
                type: "text",
                text: `❌ **Build Failed**\n\n**Error:** ${buildResult.error}\n\n💡 **Common Issues:**\n- **Missing Dockerfiles:** Use \`nexlayer_generate_dockerfile\` first\n- **Docker not running:** Start Docker daemon\n- **Repository path:** Check path contains generated Dockerfiles\n- **Network issues:** Check ttl.sh registry access`
              }]
            };
          }
          
          const images = [];
          if (buildResult.clientImage) images.push(`**Client:** ${buildResult.clientImage}`);
          if (buildResult.serverImage) images.push(`**Server:** ${buildResult.serverImage}`);
          
          const ports = Object.entries(buildResult.ports)
            .map(([service, port]) => `**${service}:** ${port}`)
            .join('\n');
          
          let resultText = `🎉 **Build Successful!**\n\n**📦 Container Images Built from MCP Dockerfiles:**\n${images.join('\n')}\n\n**🔌 Service Ports:**\n${ports}\n\n**🕐 TTL Registry:** Images on ttl.sh expire in 1 hour`;
          
          // Add LLM insights if available
          if ((buildResult as any).llmInsights) {
            resultText += `\n\n🤖 **LLM Optimization Analysis:**\n${(buildResult as any).llmInsights}`;
          }
          
          if ((buildResult as any).dagSummary) {
            resultText += `\n\n📋 **Build Pipeline Summary:**\n${(buildResult as any).dagSummary}`;
          }
          
          resultText += `\n\n💡 **Next Steps:**\n1. Use \`nexlayer_generate_intelligent_yaml\` to create optimized deployment config\n2. The YAML generator will automatically patch these ttl.sh image URLs into the pods\n3. Deploy with \`nexlayer_deploy\` for production deployment`;

          // Create structured data for AI agents
          const structuredImages = [];
          if (buildResult.clientImage) {
            structuredImages.push({
              service: "frontend",
              image: buildResult.clientImage,
              port: buildResult.ports.client || 3000
            });
          }
          if (buildResult.serverImage) {
            structuredImages.push({
              service: "backend", 
              image: buildResult.serverImage,
              port: buildResult.ports.server || 8000
            });
          }
          
          return {
            content: [
              {
                type: "text",
                text: resultText
              },
              {
                type: "text",
                text: `**🤖 LLM-Friendly Build Results for Nexlayer YAML:**\n\`\`\`json\n${JSON.stringify(structuredImages, null, 2)}\n\`\`\`\n\n**🔧 Usage:** Use this structured data to populate the 'image' fields in your Nexlayer YAML pods. Each object contains the service name, ttl.sh image URL, and detected port for seamless YAML generation.`
              }
            ]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ **Build Process Failed**\n\n**Error:** ${error.message}\n\n💡 Check that Docker is running and the repository path is correct.`
            }]
          };
        }
      }
    );
  }
}
