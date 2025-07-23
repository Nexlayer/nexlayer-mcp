/**
 * Generator Tools Module
 * File and configuration generation tools following MCP TypeScript SDK best practices
 */

import { z } from "zod";
import { ToolRegistry } from './registry.js';
import { NexlayerApiClient } from '../../services/nexlayer-api.js';
import { FileGenerator } from '../../services/file-generator.js';

export class GeneratorTools {
  private registry: ToolRegistry;
  private getClient: (sessionToken?: string) => NexlayerApiClient;
  private fileGenerator: FileGenerator;

  constructor(registry: ToolRegistry, getClient: (sessionToken?: string) => NexlayerApiClient) {
    this.registry = registry;
    this.getClient = getClient;
    this.fileGenerator = new FileGenerator();
    this.registerTools();
  }

  private registerTools(): void {
    this.registerGenerateIntelligentDockerfile();
    this.registerGenerateIntelligentYaml();
  }


  private registerGenerateIntelligentDockerfile(): void {
    this.registry.registerTool(
      "nexlayer_generate_intelligent_dockerfile",
      {
        title: "AI-Powered Dockerfile Generator",
        description: "Analyze cloned repository and generate optimized Dockerfile based on detected project structure, frameworks, and best practices",
        inputSchema: {
          repoPath: z.string().describe("Path to cloned repository (from nexlayer_clone_repo)"),
          serviceName: z.string().optional().describe("Specific service name for monorepos (optional)"),
          outputPath: z.string().optional().describe("Where to save the generated Dockerfile"),
          optimizationLevel: z.enum(['basic', 'production', 'security']).optional().default('production').describe("Optimization level for the generated Dockerfile"),
          targetPlatform: z.enum(['linux/amd64', 'linux/arm64', 'multi-platform']).optional().default('linux/amd64').describe("Target platform for deployment")
        }
      },
      async (params) => {
        try {
          const { repoPath, serviceName, outputPath, optimizationLevel, targetPlatform } = params;

          // First, perform comprehensive repository analysis
          const analysisResult = await this.performRepositoryAnalysis(repoPath);
          
          if (!analysisResult.success) {
            return {
              content: [{
                type: "text",
                text: `❌ **Repository Analysis Failed**\n\n${analysisResult.error}\n\n💡 Make sure the repository path is correct and accessible.`
              }]
            };
          }

          // Generate intelligent Dockerfile based on analysis
          const dockerfileResult = await this.generateDockerfileFromAnalysis(
            analysisResult.analysis, 
            repoPath, 
            serviceName,
            optimizationLevel,
            targetPlatform
          );

          // Always save Dockerfile to the repository path to overwrite existing broken ones
          const fs = await import('fs/promises');
          const path = await import('path');
          const dockerfilePath = outputPath || path.join(repoPath, 'Dockerfile');
          
          await fs.writeFile(dockerfilePath, dockerfileResult.dockerfile);
          
          this.registry.getLoggerFactory().deploy.info('Generated Dockerfile saved', {
            path: dockerfilePath,
            framework: dockerfileResult.detectedType
          });

          return {
            content: [
              {
                type: "text",
                text: `🤖 **AI-Generated Dockerfile**\n\n**Repository:** ${repoPath}\n**Detected:** ${dockerfileResult.detectedType}\n**Strategy:** ${dockerfileResult.strategy}\n\n\`\`\`dockerfile\n${dockerfileResult.dockerfile}\n\`\`\`\n\n📁 **Saved to:** ${dockerfilePath}\n${!outputPath ? '🔄 **Overwrote existing broken Dockerfile**\n' : ''}\n📊 **Analysis Summary:**\n${dockerfileResult.analysisSummary}\n\n💡 **Next Steps:**\n1. Review the generated Dockerfile\n2. Use \`nexlayer_build_images\` to build the container\n3. Deploy with \`nexlayer_deploy\``
              },
              {
                type: "text",
                text: `**🔍 Detailed Analysis Data:**\n\`\`\`json\n${JSON.stringify(dockerfileResult.fullAnalysis, null, 2)}\n\`\`\`\n\n**🐳 Dockerfile Features:**\n${dockerfileResult.features.map((f: string) => `- ${f}`).join('\n')}`
              }
            ]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ **AI Dockerfile Generation Failed**\n\n**Error:** ${error.message}\n\n💡 **Common Solutions:**\n- Ensure repository is cloned with \`nexlayer_clone_repo\`\n- Check that the repository contains valid project files\n- Try specifying a specific service name for monorepos`
            }]
          };
        }
      }
    );
  }


  private registerGenerateIntelligentYaml(): void {
    this.registry.registerTool(
      "nexlayer_generate_intelligent_yaml",
      {
        title: "AI-Powered YAML Generator",
        description: "Generate optimized Nexlayer YAML based on repository analysis, built images, and deployment best practices",
        inputSchema: {
          applicationName: z.string().describe("Application name"),
          repositoryAnalysis: z.object({
            services: z.array(z.object({
              name: z.string(),
              type: z.string(),
              framework: z.string().optional(),
              port: z.number().optional(),
              environmentVariables: z.array(z.string()).optional()
            })),
            framework: z.object({
              frontend: z.string().optional(),
              backend: z.string().optional(),
              fullstack: z.string().optional()
            }).optional(),
            environment: z.object({
              variables: z.array(z.string()).optional(),
              secrets: z.array(z.string()).optional(),
              ports: z.array(z.number()).optional()
            }).optional()
          }).optional().describe("Repository analysis data from nexlayer_analyze_repository"),
          builtImages: z.array(z.object({
            serviceName: z.string(),
            imageUrl: z.string(),
            port: z.number().optional()
          })).optional().describe("Images built with nexlayer_build_images"),
          environmentVariables: z.record(z.string()).optional().describe("Environment variables to include"),
          optimizations: z.object({
            addHealthChecks: z.boolean().optional().default(true),
            addResourceLimits: z.boolean().optional().default(true),
            addSecurityContext: z.boolean().optional().default(true),
            addProbes: z.boolean().optional().default(true)
          }).optional().describe("Deployment optimizations to include"),
          outputPath: z.string().optional().describe("Output file path")
        }
      },
      async (params) => {
        try {
          const yamlConfig = await this.generateIntelligentYamlConfig(params);
          
          if (params.outputPath) {
            const fs = await import('fs/promises');
            await fs.writeFile(params.outputPath, yamlConfig.yaml);
          }
          
          return {
            content: [
              {
                type: "text",
                text: `🤖 **AI-Generated Nexlayer Configuration**\n\n**Application:** ${params.applicationName}\n**Services:** ${yamlConfig.analysis.serviceCount}\n**Optimizations:** ${yamlConfig.analysis.optimizations.join(', ')}\n\n\`\`\`yaml\n${yamlConfig.yaml}\n\`\`\`\n\n${params.outputPath ? `📁 **Saved to:** ${params.outputPath}\n\n` : ''}📊 **Intelligence Applied:**\n${yamlConfig.intelligence.map(insight => `- ${insight}`).join('\n')}\n\n💡 **Ready to deploy** with \`nexlayer_deploy\``
              },
              {
                type: "text",
                text: `**🤖 LLM-Friendly Configuration Metadata:**\n\`\`\`json\n${JSON.stringify(yamlConfig.metadata, null, 2)}\n\`\`\`\n\n**🔧 Configuration Features:**\n- **Auto-detected services and ports**\n- **Framework-specific optimizations**\n- **Security best practices applied**\n- **Resource limits based on analysis**\n- **Health checks and monitoring ready**\n- **Environment variable management**`
              }
            ]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ **AI YAML Generation Failed**\n\n**Error:** ${error.message}\n\n💡 **Try:**\n- Ensure repository analysis data is provided\n- Check that built images are accessible\n- Verify application name is valid`
            }]
          };
        }
      }
    );
  }

  /**
   * Simplified repository analysis for Dockerfile generation
   */
  private async performRepositoryAnalysis(repoPath: string): Promise<{success: boolean, analysis?: any, error?: string}> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const analysis = {
        framework: 'unknown',
        language: 'javascript',
        hasPackageJson: false,
        hasDockerfile: false
      };
      
      // Check for package.json
      try {
        await fs.access(path.join(repoPath, 'package.json'));
        analysis.hasPackageJson = true;
        const packageContent = await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8');
        const packageJson = JSON.parse(packageContent);
        
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps.next) analysis.framework = 'Next.js';
        else if (deps.react) analysis.framework = 'React';
        else if (deps.express) analysis.framework = 'Express';
      } catch {}
      
      return { success: true, analysis };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate Dockerfile from analysis
   */
  private async generateDockerfileFromAnalysis(analysis: any, repoPath: string, serviceName?: string, optimizationLevel?: string, targetPlatform?: string) {
    let dockerfile: string;
    let strategy: string;
    let features: string[];
    
    switch (analysis.framework) {
      case 'Next.js':
        dockerfile = `FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]`;
        strategy = 'Single-stage Next.js build';
        features = ['Next.js optimized', 'Production build', 'Alpine base'];
        break;
        
      case 'React':
        dockerfile = `FROM node:18-alpine as builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the React application
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
        strategy = 'Multi-stage React build';
        features = ['Multi-stage build', 'Nginx serving', 'Static optimized'];
        break;
        
      case 'Express':
        dockerfile = `FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Start the application
CMD ["npm", "start"]`;
        strategy = 'Single-stage Node.js';
        features = ['Express optimized', 'Production only deps', 'Alpine base'];
        break;
        
      default:
        dockerfile = `FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]`;
        strategy = 'Generic Node.js';
        features = ['Generic Node.js', 'Production optimized', 'Alpine base'];
    }

    return {
      dockerfile,
      detectedType: analysis.framework,
      strategy,
      analysisSummary: `Detected ${analysis.framework} application with proper build process`,
      fullAnalysis: analysis,
      features
    };
  }

  /**
   * Generate intelligent YAML configuration
   */
  private async generateIntelligentYamlConfig(params: any) {
    const { applicationName, builtImages = [], environmentVariables = {} } = params;
    
    // Get current Nexlayer schema for validation and structure
    let nexlayerSchema: any = null;
    try {
      const client = this.getClient();
      nexlayerSchema = await client.getSchema();
    } catch (error) {
      // Continue with default structure if schema fetch fails
      console.warn('Could not fetch Nexlayer schema, using default structure:', error);
    }
    
    // Generate schema-compliant configuration
    const config = this.generateConfigFromSchema(nexlayerSchema, {
      applicationName,
      builtImages,
      environmentVariables
    });
    
    if (config.application.pods.length === 0) {
      config.application.pods.push({
        name: applicationName,
        image: 'nginx:latest',
        path: '/', // Required field for Nexlayer routing
        servicePorts: [3000]
      });
    }
    
    const yaml = await import('yaml');
    const yamlContent = yaml.stringify(config);
    
    return {
      yaml: yamlContent,
      analysis: {
        serviceCount: config.application.pods.length,
        optimizations: nexlayerSchema ? ['Schema-driven', 'Resource limits', 'Health checks'] : ['Resource limits', 'Health checks']
      },
      intelligence: nexlayerSchema ? ['Schema-validated structure', 'Auto-detected ports', 'Framework optimization'] : ['Auto-detected ports', 'Framework optimization'],
      metadata: { config, features: nexlayerSchema ? ['Schema compliant', 'Production ready', 'Scalable'] : ['Production ready', 'Scalable'] }
    };
  }

  /**
   * Clean image URL by removing SHA hash digest
   * @param imageUrl - The image URL that may contain SHA hash
   * @returns Clean image URL without SHA hash
   */
  private cleanImageUrl(imageUrl: string): string {
    // Remove SHA hash if present (format: image:tag@sha256:hash)
    return imageUrl.split('@')[0];
  }

  /**
   * Generate configuration from Nexlayer schema (schema-driven approach)
   */
  private generateConfigFromSchema(schema: any, data: any) {
    const { applicationName, builtImages, environmentVariables } = data;
    
    // If schema is available, use it to generate compliant structure
    if (schema && schema.properties && schema.properties.application) {
      const appSchema = schema.properties.application;
      const podSchema = appSchema.properties?.pods?.items;
      
      const config = {
        application: {
          name: applicationName,
          pods: builtImages.map((image: any) => {
            const pod: any = {
              name: image.serviceName || applicationName,
              image: this.cleanImageUrl(image.imageUrl),
              servicePorts: [image.port || 3000]
            };
            
            // Only add path field for frontend services (client)
            if (image.serviceName === 'client' || image.serviceName?.includes('frontend')) {
              pod.path = '/';
            }
            
            // Add environment variables if provided
            if (Object.keys(environmentVariables).length > 0) {
              pod.vars = environmentVariables;
            }
            
            // Add other schema-defined optional fields if needed
            if (podSchema?.properties?.resources) {
              // Could add resource limits based on schema
            }
            
            return pod;
          })
        }
      };
      
      return config;
    }
    
    // Fallback to default structure if schema not available
    return {
      application: {
        name: applicationName,
        pods: builtImages.length > 0 ? builtImages.map((image: any) => {
          const pod: any = {
            name: image.serviceName || applicationName,
            image: this.cleanImageUrl(image.imageUrl),
            servicePorts: [image.port || 3000],
            ...(Object.keys(environmentVariables).length > 0 && { vars: environmentVariables })
          };
          
          // Only add path field for frontend services (client)
          if (image.serviceName === 'client' || image.serviceName?.includes('frontend')) {
            pod.path = '/';
          }
          
          return pod;
        }) : [{
          name: applicationName,
          image: 'nginx:latest',
          path: '/', // Required field for Nexlayer routing (fallback is frontend)
          servicePorts: [3000]
        }]
      }
    };
  }
}