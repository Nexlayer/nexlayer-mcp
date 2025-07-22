/**
 * Analysis Tools Module
 * Project analysis, schema validation, and environment detection tools
 */

import { z } from "zod";
import { ToolRegistry } from './registry.js';
import { NexlayerApiClient } from '../../services/nexlayer-api.js';

export class AnalysisTools {
  private registry: ToolRegistry;
  private getClient: (sessionToken?: string) => NexlayerApiClient;

  constructor(registry: ToolRegistry, getClient: (sessionToken?: string) => NexlayerApiClient) {
    this.registry = registry;
    this.getClient = getClient;
    this.registerTools();
  }

  private registerTools(): void {
    this.registerCloneRepository();
    this.registerAnalyzeRepository();
    this.registerDetectEnvAndSecrets();
  }


  /**
   * Clone a GitHub repository for analysis
   */
  private registerCloneRepository(): void {
    this.registry.registerTool(
      "nexlayer_clone_repo",
      {
        title: "Repository Cloner",
        description: "Clone a GitHub repository to a temporary directory for analysis and deployment",
        inputSchema: {
          repoUrl: z.string().url().describe("GitHub repository URL to clone"),
          verbose: z.boolean().optional().default(false).describe("Enable verbose logging")
        }
      },
      async (params) => {
        try {
          const { repoUrl, verbose } = params;
          
          // Generate unique directory
          const { v4: uuidv4 } = await import('uuid');
          const buildId = uuidv4().substring(0, 8);
          const repoPath = `/tmp/nexlayer-repo-${buildId}`;
          
          // Clone the repository
          const { spawn } = await import('child_process');
          const cloneResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
            const child = spawn('git', ['clone', repoUrl, repoPath], {
              stdio: verbose ? 'inherit' : 'pipe'
            });
            
            child.on('close', (code) => {
              if (code === 0) {
                resolve({ success: true });
              } else {
                resolve({
                  success: false,
                  error: `Git clone failed with exit code: ${code}`
                });
              }
            });
            
            child.on('error', (error) => {
              resolve({
                success: false,
                error: `Git clone failed: ${error.message}`
              });
            });
          });
          
          if (!cloneResult.success) {
            return {
              content: [{
                type: "text",
                text: `❌ **Clone Failed**\n\n**Error:** ${cloneResult.error}\n\n💡 **Check:**\n- Repository URL is correct\n- Repository is public or you have access\n- Internet connection is stable`
              }]
            };
          }
          
          return {
            content: [{
              type: "text",
              text: `✅ **Repository Cloned Successfully**\n\n**Repository:** ${repoUrl}\n**Local Path:** ${repoPath}\n\n💡 **Next Steps:**\n1. Use \`nexlayer_analyze_repository\` to analyze the codebase\n2. Use \`nexlayer_generate_dockerfile\` to create optimized Dockerfiles\n3. Use \`nexlayer_build_images\` to build container images\n4. Use \`nexlayer_deploy\` for final deployment`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ **Clone Failed**\n\n**Error:** ${error.message}`
            }]
          };
        }
      }
    );
  }

  /**
   * Comprehensive repository analysis for intelligent deployment decisions
   */
  private registerAnalyzeRepository(): void {
    this.registry.registerTool(
      "nexlayer_analyze_repository",
      {
        title: "Deep Repository Analyzer",
        description: "Analyze repository structure, detect frameworks, languages, services, and generate deployment recommendations",
        inputSchema: {
          repoPath: z.string().describe("Path to the cloned repository"),
          deep: z.boolean().optional().default(true).describe("Perform deep analysis including dependency scanning"),
          includeSecrets: z.boolean().optional().default(true).describe("Scan for environment variables and secrets patterns")
        }
      },
      async (params) => {
        try {
          const { repoPath, deep, includeSecrets } = params;
          
          if (!await this.pathExists(repoPath)) {
            return {
              content: [{
                type: "text",
                text: `❌ **Repository Not Found**\n\nPath does not exist: ${repoPath}\n\n💡 Use \`nexlayer_clone_repo\` first to clone the repository.`
              }]
            };
          }

          const analysis = await this.performDeepRepositoryAnalysis(repoPath, deep, includeSecrets);
          const structuredData = this.formatStructuredAnalysis(analysis);
          
          return {
            content: [
              {
                type: "text", 
                text: this.formatRepositoryAnalysis(analysis, repoPath)
              },
              {
                type: "text",
                text: `**🤖 LLM-Friendly Structured Data for Nexlayer YAML Generation:**\n\`\`\`json\n${JSON.stringify(structuredData, null, 2)}\n\`\`\`\n\n**🔧 Usage:** This structured data contains everything needed to generate perfect Nexlayer YAML configurations. Use this data structure to map services, detect ports, configure environment variables, and set up dependencies according to the Nexlayer schema at app.nexlayer.io/schema.`
              }
            ]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ **Analysis Failed**\n\n**Error:** ${error.message}`
            }]
          };
        }
      }
    );
  }


  private registerDetectEnvAndSecrets(): void {
    this.registry.registerTool(
      "nexlayer_detect_env_and_secrets",
      {
        description: "Scan project for environment variables, secrets, and managed services",
        inputSchema: {
          projectPath: z.string().optional().default('.').describe("Path to project directory"),
          scanDepth: z.number().optional().default(3).describe("Directory scan depth"),
          includeNodeModules: z.boolean().optional().default(false).describe("Include node_modules in scan")
        }
      },
      async (params) => {
        try {
          const { projectPath, scanDepth, includeNodeModules } = params;
          const analysis = await this.analyzeProjectEnvironment(projectPath, scanDepth, includeNodeModules);
          
          return {
            content: [
              {
                type: "text",
                text: `Environment Analysis for ${projectPath}:\n\n**🔍 Detected Framework:**\n${analysis.framework || 'Unknown'}\n\n**📝 Environment Variables Found:**\n${analysis.envVars.length > 0 ? analysis.envVars.map(v => `- ${v}`).join('\n') : 'None detected'}\n\n**🔐 Secrets Detected:**\n${analysis.secrets.length > 0 ? analysis.secrets.map(s => `- ${s} (⚠️ Keep secure)`).join('\n') : 'None detected'}\n\n**☁️ Managed Services:**\n${analysis.services.length > 0 ? analysis.services.map(s => `- ${s}`).join('\n') : 'None detected'}\n\n**🗃️ Database Connections:**\n${analysis.databases.length > 0 ? analysis.databases.map(d => `- ${d}`).join('\n') : 'None detected'}\n\n**💡 Deployment Recommendations:**\n${analysis.recommendations.join('\n')}`
              }
            ]
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to analyze project environment: ${error.message}\n\n💡 Make sure the project path exists and you have read permissions.`
              }
            ]
          };
        }
      }
    );
  }

  private async analyzeProjectEnvironment(projectPath: string, scanDepth: number, includeNodeModules: boolean) {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const analysis = {
      framework: '',
      envVars: [] as string[],
      secrets: [] as string[],
      services: [] as string[],
      databases: [] as string[],
      recommendations: [] as string[]
    };

    try {
      // Check for package.json to determine framework
      const packagePath = path.join(projectPath, 'package.json');
      try {
        const packageContent = await fs.readFile(packagePath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        
        // Detect framework from dependencies
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps.next) analysis.framework = 'Next.js';
        else if (deps.react) analysis.framework = 'React';
        else if (deps.vue) analysis.framework = 'Vue.js';
        else if (deps.angular) analysis.framework = 'Angular';
        else if (deps.express) analysis.framework = 'Express.js';
        else if (deps.fastify) analysis.framework = 'Fastify';
        else if (packageJson.type === 'module' || deps.typescript) analysis.framework = 'Node.js/TypeScript';
        else analysis.framework = 'Node.js';
        
        // Check for common services in dependencies
        if (deps['@supabase/supabase-js']) analysis.services.push('Supabase');
        if (deps.openai) analysis.services.push('OpenAI');
        if (deps['@auth0/auth0-spa-js']) analysis.services.push('Auth0');
        if (deps.stripe) analysis.services.push('Stripe');
        if (deps.prisma) analysis.databases.push('Prisma ORM');
        if (deps.mongoose) analysis.databases.push('MongoDB (Mongoose)');
        if (deps.pg || deps.postgres) analysis.databases.push('PostgreSQL');
        if (deps.mysql2) analysis.databases.push('MySQL');
        
      } catch {
        // Check for other language indicators
        try {
          await fs.access(path.join(projectPath, 'requirements.txt'));
          analysis.framework = 'Python';
        } catch {
          try {
            await fs.access(path.join(projectPath, 'go.mod'));
            analysis.framework = 'Go';
          } catch {
            try {
              await fs.access(path.join(projectPath, 'Cargo.toml'));
              analysis.framework = 'Rust';
            } catch {
              analysis.framework = 'Unknown';
            }
          }
        }
      }

      // Scan for environment files
      const envFiles = ['.env', '.env.local', '.env.production', '.env.development', '.env.example'];
      for (const envFile of envFiles) {
        try {
          const envPath = path.join(projectPath, envFile);
          const envContent = await fs.readFile(envPath, 'utf-8');
          const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
          
          for (const line of envLines) {
            const [key] = line.split('=');
            if (key) {
              analysis.envVars.push(key.trim());
              
              // Check for secrets
              const lowerKey = key.toLowerCase();
              if (lowerKey.includes('secret') || lowerKey.includes('key') || lowerKey.includes('token') || lowerKey.includes('password')) {
                analysis.secrets.push(key.trim());
              }
              
              // Check for service indicators
              if (lowerKey.includes('supabase')) analysis.services.push('Supabase');
              if (lowerKey.includes('openai')) analysis.services.push('OpenAI');
              if (lowerKey.includes('auth0')) analysis.services.push('Auth0');
              if (lowerKey.includes('database_url') || lowerKey.includes('db_url')) analysis.databases.push('Database Connection');
            }
          }
        } catch {
          // File doesn't exist, continue
        }
      }

      // Generate recommendations
      if (analysis.framework) {
        analysis.recommendations.push(`✅ Detected ${analysis.framework} project - use generate-dockerfile to containerize`);
      }
      
      if (analysis.envVars.length > 0) {
        analysis.recommendations.push(`📝 ${analysis.envVars.length} environment variables found - include in your deployment configuration`);
      }
      
      if (analysis.secrets.length > 0) {
        analysis.recommendations.push(`🔐 ${analysis.secrets.length} secrets detected - ensure these are properly secured in deployment`);
      }
      
      if (analysis.services.length > 0) {
        analysis.recommendations.push(`☁️ Managed services detected - verify API keys and configuration for ${analysis.services.join(', ')}`);
      }
      
      if (analysis.databases.length > 0) {
        analysis.recommendations.push(`🗃️ Database connections found - consider using nexlayer_add_database tool for managed database setup`);
      }
      
      if (analysis.recommendations.length === 0) {
        analysis.recommendations.push('🚀 Project structure looks clean - ready for deployment with nexlayer_smart_deploy');
      }

    } catch (error) {
      analysis.recommendations.push(`⚠️ Error analyzing project: ${error}`);
    }

    return analysis;
  }

  // New comprehensive analysis methods
  
  private async pathExists(path: string): Promise<boolean> {
    const fs = await import('fs/promises');
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async performDeepRepositoryAnalysis(repoPath: string, deep: boolean, includeSecrets: boolean) {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const analysis = {
      architecture: 'unknown' as 'monorepo' | 'multi-service' | 'single-service' | 'unknown',
      language: { primary: 'unknown', secondary: [] as string[] },
      framework: { frontend: '', backend: '', fullstack: '', other: [] as string[] },
      services: [] as any[],
      dependencies: { production: [] as string[], development: [] as string[], total: 0 },
      packageManager: 'unknown' as string,
      buildSystem: { hasDockerfile: false, buildScripts: [] as string[], startScripts: [] as string[] },
      database: { detected: [] as string[], connectionStrings: [] as string[] },
      apis: { external: [] as string[], authentication: [] as string[] },
      environment: { variables: [] as string[], secrets: [] as string[], ports: [] as number[] },
      deployment: { 
        recommendations: [] as string[],
        complexity: 'simple' as 'simple' | 'moderate' | 'complex',
        readiness: 0  // 0-100 score
      }
    };

    try {
      // 1. Detect architecture and package manager
      await this.detectArchitectureAndPackageManager(repoPath, analysis);
      
      // 2. Analyze services structure
      await this.analyzeServicesStructure(repoPath, analysis);
      
      if (deep) {
        // 3. Deep dependency analysis
        await this.analyzeAllDependencies(repoPath, analysis);
        
        // 4. Framework detection
        await this.detectAllFrameworks(analysis);
        
        // 5. Build system analysis
        await this.analyzeBuildSystem(repoPath, analysis);
      }
      
      if (includeSecrets) {
        // 6. Environment and secrets analysis
        await this.analyzeEnvironmentAndSecrets(repoPath, analysis);
      }
      
      // 7. Generate deployment recommendations
      this.generateDeploymentRecommendations(analysis);
      
      // 8. Calculate deployment readiness score
      this.calculateDeploymentReadiness(analysis);

    } catch (error) {
      analysis.deployment.recommendations.push(`⚠️ Analysis error: ${error}`);
    }

    return analysis;
  }

  private async detectArchitectureAndPackageManager(repoPath: string, analysis: any): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const files = await fs.readdir(repoPath);
    
    // Detect package manager
    if (files.includes('pnpm-lock.yaml') || files.includes('pnpm-workspace.yaml')) {
      analysis.packageManager = 'pnpm';
      analysis.language.primary = 'javascript';
    } else if (files.includes('yarn.lock')) {
      analysis.packageManager = 'yarn';
      analysis.language.primary = 'javascript';
    } else if (files.includes('package-lock.json') || files.includes('package.json')) {
      analysis.packageManager = 'npm';
      analysis.language.primary = 'javascript';
    } else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
      analysis.packageManager = 'pip';
      analysis.language.primary = 'python';
    } else if (files.includes('go.mod')) {
      analysis.packageManager = 'go mod';
      analysis.language.primary = 'go';
    }

    // Detect TypeScript
    if (files.includes('tsconfig.json') || files.includes('tsconfig.base.json')) {
      analysis.language.primary = 'typescript';
    }

    // Detect architecture
    if (files.includes('lerna.json') || files.includes('pnpm-workspace.yaml') || files.includes('rush.json')) {
      analysis.architecture = 'monorepo';
    } else {
      const serviceDirs = ['client', 'server', 'frontend', 'backend', 'api', 'web', 'app'];
      const foundDirs = files.filter(file => serviceDirs.includes(file.toLowerCase()));
      analysis.architecture = foundDirs.length >= 2 ? 'multi-service' : 'single-service';
    }
  }

  private async analyzeServicesStructure(repoPath: string, analysis: any): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    if (analysis.architecture === 'single-service') {
      const service = await this.analyzeService(repoPath, 'app');
      analysis.services.push(service);
      return;
    }

    // Look for service directories
    const files = await fs.readdir(repoPath);
    const serviceDirs = ['client', 'server', 'frontend', 'backend', 'api', 'web', 'app', 'packages', 'services', 'apps'];
    
    for (const file of files) {
      const filePath = path.join(repoPath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory() && (serviceDirs.includes(file.toLowerCase()) || file.startsWith('service-'))) {
        const service = await this.analyzeService(filePath, file);
        analysis.services.push(service);
      }
    }

    // Check packages directory for monorepos
    if (analysis.services.length === 0 && files.includes('packages')) {
      const packagesPath = path.join(repoPath, 'packages');
      const packages = await fs.readdir(packagesPath);
      
      for (const pkg of packages) {
        const pkgPath = path.join(packagesPath, pkg);
        const service = await this.analyzeService(pkgPath, pkg);
        analysis.services.push(service);
      }
    }
  }

  private async analyzeService(servicePath: string, serviceName: string): Promise<any> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const files = await fs.readdir(servicePath);
    
    const service = {
      name: serviceName,
      path: servicePath,
      type: this.guessServiceType(serviceName, files),
      language: 'unknown',
      framework: '',
      port: undefined as number | undefined,
      hasDockerfile: files.includes('Dockerfile'),
      dependencies: [] as string[],
      scripts: {} as Record<string, string>,
      environmentVariables: [] as string[]
    };

    // Analyze package.json
    if (files.includes('package.json')) {
      const packageJsonPath = path.join(servicePath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      service.language = files.includes('tsconfig.json') ? 'typescript' : 'javascript';
      service.dependencies = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });
      service.scripts = packageJson.scripts || {};
      service.framework = this.detectFrameworkFromDependencies(service.dependencies);
      service.port = this.guessPortFromScripts(service.scripts, service.type);
    }

    // Scan for environment variables
    service.environmentVariables = await this.scanEnvironmentVariables(servicePath);

    return service;
  }

  private guessServiceType(name: string, files: string[]): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('frontend') || lowerName.includes('client') || lowerName.includes('web') || lowerName.includes('ui')) {
      return 'frontend';
    }
    if (lowerName.includes('backend') || lowerName.includes('server') || lowerName.includes('api')) {
      return 'backend';
    }
    
    // Guess from files
    if (files.some(f => f === 'index.html' || f === 'public')) return 'frontend';
    if (files.some(f => f.includes('server') || f.includes('app.js') || f.includes('main.py'))) return 'backend';
    
    return 'unknown';
  }

  private detectFrameworkFromDependencies(deps: string[]): string {
    if (deps.includes('next')) return 'Next.js';
    if (deps.includes('react')) return 'React';
    if (deps.includes('vue')) return 'Vue.js';
    if (deps.includes('angular')) return 'Angular';
    if (deps.includes('svelte')) return 'Svelte';
    if (deps.includes('express')) return 'Express.js';
    if (deps.includes('fastify')) return 'Fastify';
    if (deps.includes('koa')) return 'Koa';
    if (deps.includes('@nestjs/core')) return 'NestJS';
    return '';
  }

  private guessPortFromScripts(scripts: Record<string, string>, serviceType: string): number | undefined {
    const scriptString = JSON.stringify(scripts).toLowerCase();
    
    if (scriptString.includes(':3000') || scriptString.includes('port 3000')) return 3000;
    if (scriptString.includes(':5000') || scriptString.includes('port 5000')) return 5000;
    if (scriptString.includes(':8000') || scriptString.includes('port 8000')) return 8000;
    if (scriptString.includes(':8080') || scriptString.includes('port 8080')) return 8080;
    
    // Default ports by service type
    return serviceType === 'frontend' ? 3000 : serviceType === 'backend' ? 5000 : undefined;
  }

  private async scanEnvironmentVariables(servicePath: string): Promise<string[]> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const envVars: Set<string> = new Set();
    const envFiles = ['.env', '.env.example', '.env.local', '.env.template'];
    
    for (const envFile of envFiles) {
      try {
        const envPath = path.join(servicePath, envFile);
        const content = await fs.readFile(envPath, 'utf-8');
        const vars = content.split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => line.split('=')[0].trim())
          .filter(Boolean);
        vars.forEach(v => envVars.add(v));
      } catch {
        // File doesn't exist
      }
    }
    
    return Array.from(envVars);
  }

  private async analyzeAllDependencies(repoPath: string, analysis: any): Promise<void> {
    // Combine dependencies from all services
    const allDeps = new Set<string>();
    const allDevDeps = new Set<string>();
    
    analysis.services.forEach((service: any) => {
      service.dependencies.forEach((dep: string) => {
        allDeps.add(dep);
      });
    });
    
    analysis.dependencies.production = Array.from(allDeps);
    analysis.dependencies.total = allDeps.size;
  }

  private detectAllFrameworks(analysis: any): void {
    const allDeps = analysis.dependencies.production;
    
    // Frontend frameworks
    if (allDeps.includes('react')) analysis.framework.frontend = 'React';
    else if (allDeps.includes('vue')) analysis.framework.frontend = 'Vue.js';
    else if (allDeps.includes('angular')) analysis.framework.frontend = 'Angular';
    
    // Backend frameworks
    if (allDeps.includes('express')) analysis.framework.backend = 'Express.js';
    else if (allDeps.includes('fastify')) analysis.framework.backend = 'Fastify';
    else if (allDeps.includes('@nestjs/core')) analysis.framework.backend = 'NestJS';
    
    // Fullstack frameworks
    if (allDeps.includes('next')) analysis.framework.fullstack = 'Next.js';
    else if (allDeps.includes('nuxt')) analysis.framework.fullstack = 'Nuxt.js';
    
    // Database ORM/clients
    if (allDeps.includes('prisma')) analysis.database.detected.push('Prisma');
    if (allDeps.includes('mongoose')) analysis.database.detected.push('MongoDB');
    if (allDeps.includes('pg') || allDeps.includes('postgres')) analysis.database.detected.push('PostgreSQL');
    
    // External APIs
    if (allDeps.includes('openai')) analysis.apis.external.push('OpenAI');
    if (allDeps.includes('stripe')) analysis.apis.external.push('Stripe');
    if (allDeps.includes('@supabase/supabase-js')) analysis.apis.external.push('Supabase');
  }

  private async analyzeBuildSystem(repoPath: string, analysis: any): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Check for Dockerfile in root
    analysis.buildSystem.hasDockerfile = await this.pathExists(path.join(repoPath, 'Dockerfile'));
    
    // Collect build and start scripts
    analysis.services.forEach((service: any) => {
      if (service.scripts.build) analysis.buildSystem.buildScripts.push(service.scripts.build);
      if (service.scripts.start || service.scripts.dev) {
        analysis.buildSystem.startScripts.push(service.scripts.start || service.scripts.dev);
      }
    });
  }

  private async analyzeEnvironmentAndSecrets(repoPath: string, analysis: any): Promise<void> {
    // Collect all environment variables from services
    const allEnvVars = new Set<string>();
    const secretPatterns = ['api_key', 'secret', 'token', 'password', 'private_key', 'auth'];
    
    analysis.services.forEach((service: any) => {
      service.environmentVariables.forEach((envVar: string) => {
        allEnvVars.add(envVar);
        
        // Check if it's a secret
        if (secretPatterns.some(pattern => envVar.toLowerCase().includes(pattern))) {
          analysis.environment.secrets.push(envVar);
        }
      });
    });
    
    analysis.environment.variables = Array.from(allEnvVars);
    
    // Collect ports
    analysis.services.forEach((service: any) => {
      if (service.port) {
        analysis.environment.ports.push(service.port);
      }
    });
  }

  private generateDeploymentRecommendations(analysis: any): void {
    const recs = analysis.deployment.recommendations;
    
    // Architecture recommendations
    if (analysis.architecture === 'monorepo') {
      recs.push('🏗️ Monorepo detected - consider selective service deployment');
      analysis.deployment.complexity = 'complex';
    } else if (analysis.architecture === 'multi-service') {
      recs.push('🔗 Multi-service architecture - use container orchestration');
      analysis.deployment.complexity = 'moderate';
    } else {
      recs.push('📦 Single service - straightforward deployment');
      analysis.deployment.complexity = 'simple';
    }
    
    // Framework recommendations
    if (analysis.framework.fullstack) {
      recs.push(`⚡ ${analysis.framework.fullstack} detected - use optimized build process`);
    }
    
    if (analysis.framework.frontend && analysis.framework.backend) {
      recs.push('🔄 Full-stack application - deploy frontend and backend separately');
    }
    
    // Database recommendations
    if (analysis.database.detected.length > 0) {
      recs.push(`💾 Database dependencies: ${analysis.database.detected.join(', ')} - ensure connection strings`);
    }
    
    // API recommendations
    if (analysis.apis.external.length > 0) {
      recs.push(`🌐 External APIs: ${analysis.apis.external.join(', ')} - verify API keys`);
    }
    
    // Environment recommendations
    if (analysis.environment.secrets.length > 0) {
      recs.push(`🔐 ${analysis.environment.secrets.length} secrets detected - use secure environment variables`);
    }
    
    // Build recommendations
    if (!analysis.buildSystem.hasDockerfile) {
      recs.push('🐳 No Dockerfile found - use nexlayer_generate_dockerfile');
    }
  }

  private calculateDeploymentReadiness(analysis: any): void {
    let score = 0;
    
    // Architecture clarity (+20)
    if (analysis.architecture !== 'unknown') score += 20;
    
    // Framework detection (+20)
    if (analysis.framework.frontend || analysis.framework.backend || analysis.framework.fullstack) score += 20;
    
    // Build system (+20)
    if (analysis.buildSystem.buildScripts.length > 0 || analysis.buildSystem.hasDockerfile) score += 20;
    
    // Service analysis (+20)
    if (analysis.services.length > 0 && analysis.services.every((s: any) => s.type !== 'unknown')) score += 20;
    
    // Dependencies analysis (+10)
    if (analysis.dependencies.total > 0) score += 10;
    
    // Environment setup (+10)
    if (analysis.environment.variables.length > 0) score += 10;
    
    analysis.deployment.readiness = Math.min(score, 100);
  }

  /**
   * Format analysis data as structured JSON for AI agents and Nexlayer YAML generation
   */
  private formatStructuredAnalysis(analysis: any) {
    const structuredData = {
      services: analysis.services.map((service: any) => ({
        name: service.name,
        framework: service.framework || service.type || 'generic',
        port: service.port || this.getDefaultPortForFramework(service.framework || service.type),
        buildPath: service.path || `./${service.name === 'app' ? '' : service.name}`,
        type: service.type || 'application',
        language: service.language || analysis.language.primary,
        packageManager: service.packageManager || analysis.packageManager,
        hasDockerfile: service.hasDockerfile || false,
        startCommand: service.startCommand,
        buildCommand: service.buildCommand,
        environmentVariables: service.environmentVariables || []
      })),
      environment: {
        variables: analysis.environment?.variables || [],
        secrets: analysis.environment?.secrets || []
      },
      dependencies: this.extractDependencies(analysis),
      architecture: analysis.architecture || 'single-service',
      language: {
        primary: analysis.language.primary,
        secondary: analysis.language.secondary
      },
      packageManager: analysis.packageManager,
      deployment: {
        complexity: analysis.deployment?.complexity || 'simple',
        readiness: analysis.deployment?.readiness || 85,
        recommendations: analysis.deployment?.recommendations || []
      },
      nexlayerConfig: {
        suggestedName: this.generateAppName(analysis),
        estimatedPods: analysis.services.length || 1,
        requiresDatabase: this.requiresDatabase(analysis),
        requiresRedis: this.requiresRedis(analysis),
        isLLMApplication: this.isLLMApplication(analysis),
        hasVectorDatabase: this.hasVectorDatabase(analysis)
      }
    };

    return structuredData;
  }

  private formatRepositoryAnalysis(analysis: any, repoPath: string): string {
    let output = `🔍 **Deep Repository Analysis**\n\n**Path:** ${repoPath}\n\n`;
    
    // Overview
    output += `📊 **Overview:**\n`;
    output += `- **Architecture:** ${analysis.architecture}\n`;
    output += `- **Primary Language:** ${analysis.language.primary}\n`;
    output += `- **Package Manager:** ${analysis.packageManager}\n`;
    output += `- **Deployment Readiness:** ${analysis.deployment.readiness}% (${analysis.deployment.complexity})\n\n`;
    
    // Frameworks
    const frameworks = [analysis.framework.frontend, analysis.framework.backend, analysis.framework.fullstack].filter(Boolean);
    if (frameworks.length > 0) {
      output += `🚀 **Frameworks:**\n`;
      if (analysis.framework.frontend) output += `- **Frontend:** ${analysis.framework.frontend}\n`;
      if (analysis.framework.backend) output += `- **Backend:** ${analysis.framework.backend}\n`;
      if (analysis.framework.fullstack) output += `- **Fullstack:** ${analysis.framework.fullstack}\n`;
      output += '\n';
    }
    
    // Services
    output += `🏗️ **Services (${analysis.services.length}):**\n`;
    analysis.services.forEach((service: any) => {
      output += `- **${service.name}** (${service.type})`;
      if (service.framework) output += ` - ${service.framework}`;
      if (service.port) output += ` - Port ${service.port}`;
      output += service.hasDockerfile ? ' [Dockerfile ✅]' : ' [Needs Dockerfile 🐳]';
      output += '\n';
    });
    
    // External integrations
    if (analysis.database.detected.length > 0 || analysis.apis.external.length > 0) {
      output += '\n🌐 **External Integrations:**\n';
      analysis.database.detected.forEach((db: string) => output += `- **Database:** ${db}\n`);
      analysis.apis.external.forEach((api: string) => output += `- **API:** ${api}\n`);
    }
    
    // Environment
    if (analysis.environment.variables.length > 0) {
      output += `\n🔐 **Environment (${analysis.environment.variables.length} vars, ${analysis.environment.secrets.length} secrets):**\n`;
      // Show first 5 environment variables
      analysis.environment.variables.slice(0, 5).forEach((env: string) => {
        const isSecret = analysis.environment.secrets.includes(env);
        output += `- ${env}${isSecret ? ' 🔒' : ''}\n`;
      });
      if (analysis.environment.variables.length > 5) {
        output += `- ... and ${analysis.environment.variables.length - 5} more\n`;
      }
    }
    
    // Ports
    if (analysis.environment.ports.length > 0) {
      output += `\n🔌 **Ports:** ${analysis.environment.ports.join(', ')}\n`;
    }
    
    // Deployment recommendations
    if (analysis.deployment.recommendations.length > 0) {
      output += `\n💡 **Deployment Recommendations:**\n`;
      analysis.deployment.recommendations.forEach((rec: string) => output += `${rec}\n`);
    }
    
    output += `\n🚀 **Next Steps:**\n`;
    output += `1. Generate Dockerfiles: \`nexlayer_generate_dockerfile\`\n`;
    output += `2. Build images: \`nexlayer_build_images\`\n`;
    output += `3. Create deployment config: \`nexlayer_generate_yaml\`\n`;
    output += `4. Deploy: \`nexlayer_deploy\``;
    
    return output;
  }

  /**
   * Helper methods for structured analysis
   */
  private getDefaultPortForFramework(framework: string): number {
    const portMap: Record<string, number> = {
      'react': 3000,
      'nextjs': 3000,
      'vue': 3000,
      'angular': 4200,
      'svelte': 5000,
      'express': 3000,
      'fastapi': 8000,
      'flask': 5000,
      'django': 8000,
      'spring': 8080,
      'go': 8080,
      'rust': 8080,
      'php': 8080,
      'ruby': 3000,
      'frontend': 3000,
      'backend': 8000,
      'api': 8000,
      'web': 3000,
      'app': 3000
    };
    
    return portMap[framework?.toLowerCase()] || 3000;
  }

  private extractDependencies(analysis: any): string[] {
    const deps = new Set<string>();
    
    // From analysis dependencies
    if (analysis.dependencies?.production) {
      analysis.dependencies.production.forEach((dep: string) => {
        // Map common dependencies to services
        if (dep.includes('postgres') || dep.includes('pg')) deps.add('postgres');
        if (dep.includes('redis')) deps.add('redis');
        if (dep.includes('mongo')) deps.add('mongodb');
        if (dep.includes('mysql')) deps.add('mysql');
        if (dep.includes('vector') || dep.includes('pinecone') || dep.includes('chroma')) deps.add('vector-db');
        if (dep.includes('elastic')) deps.add('elasticsearch');
      });
    }

    // From services
    analysis.services?.forEach((service: any) => {
      if (service.type === 'database') deps.add('database');
      if (service.framework?.includes('postgres')) deps.add('postgres');
      if (service.framework?.includes('redis')) deps.add('redis');
    });

    return Array.from(deps);
  }

  private generateAppName(analysis: any): string {
    const framework = analysis.framework?.fullstack || analysis.framework?.frontend || analysis.framework?.backend;
    const language = analysis.language.primary;
    
    if (framework) {
      return `${framework.toLowerCase()}-app`.replace(/[^a-z0-9-]/g, '-');
    }
    
    return `${language || 'generic'}-app`.replace(/[^a-z0-9-]/g, '-');
  }

  private requiresDatabase(analysis: any): boolean {
    return analysis.dependencies?.some((dep: string) => 
      ['postgres', 'mongodb', 'mysql', 'database'].includes(dep)
    ) || analysis.environment?.variables?.some((env: string) =>
      env.includes('DATABASE') || env.includes('DB_')
    ) || false;
  }

  private requiresRedis(analysis: any): boolean {
    return analysis.dependencies?.includes('redis') || 
           analysis.environment?.variables?.some((env: string) => env.includes('REDIS')) || 
           false;
  }

  private isLLMApplication(analysis: any): boolean {
    const llmIndicators = ['openai', 'anthropic', 'langchain', 'transformers', 'tensorflow', 'pytorch', 'huggingface'];
    return analysis.dependencies?.some((dep: string) => 
      llmIndicators.some(indicator => dep.toLowerCase().includes(indicator))
    ) || analysis.environment?.variables?.some((env: string) =>
      env.includes('OPENAI') || env.includes('ANTHROPIC') || env.includes('HF_')
    ) || false;
  }

  private hasVectorDatabase(analysis: any): boolean {
    const vectorDbIndicators = ['pinecone', 'chroma', 'vector', 'embedding'];
    return analysis.dependencies?.some((dep: string) => 
      vectorDbIndicators.some(indicator => dep.toLowerCase().includes(indicator))
    ) || false;
  }
}