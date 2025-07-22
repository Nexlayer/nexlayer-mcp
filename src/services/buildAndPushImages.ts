/**
 * TypeScript wrapper for Dagger Go binary
 * Handles container image building and pushing via Dagger
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface BuildImageResult {
  clientImage?: string;
  serverImage?: string;
  ports: {
    client?: number;
    server?: number;
    [key: string]: number | undefined;
  };
  success: boolean;
  error?: string;
  // Enhanced for AI Cloud Architect
  llmInsights?: {
    dagMutations: string[]; // LLM-suggested build optimizations applied
    nexlayerOptimizations: string[]; // Nexlayer platform-specific optimizations
    securityEnhancements: string[]; // Security improvements applied
    performanceOptimizations: string[]; // Performance tweaks made
    resourceOptimizations: string[]; // Nexlayer resource usage optimizations
    deploymentStrategy: string; // Recommended Nexlayer deployment approach
  };
  buildMetadata?: {
    originalDagSteps: number;
    optimizedDagSteps: number;
    llmReasoningTime: number; // ms spent on LLM reasoning
    confidenceScore: number; // 0-100, LLM confidence in optimizations
  };
}

export interface DaggerBuildOptions {
  repoPath: string;
  timeout?: number; // milliseconds, default 300000 (5 minutes)
  verbose?: boolean;
  llmOptimize?: boolean; // Enable LLM-aware DAG optimization
  llmProvider?: 'openai' | 'anthropic'; // LLM provider for optimization
  
  // AI Cloud Architect enhancements
  repositoryAnalysis?: any; // From nexlayer_analyze_repository
  deploymentRequirements?: {
    performance: 'low' | 'medium' | 'high';
    availability: 'basic' | 'high' | 'critical';
    security: 'standard' | 'enhanced' | 'enterprise';
    scalability: 'fixed' | 'auto' | 'global';
    budget: 'minimal' | 'moderate' | 'enterprise';
  };
  nexlayerStrategy?: {
    scalingPolicy?: 'fixed' | 'auto' | 'burst';
    resourceProfile?: 'minimal' | 'balanced' | 'performance';
    monitoring?: boolean;
    autoHealing?: boolean;
  };
  memoryContext?: string[]; // RAG context from previous successful builds
  buildPatterns?: string[]; // Memory-driven optimization patterns to apply
}

/**
 * Build and push container images using Dagger Go binary
 */
export async function buildAndPushImages(options: DaggerBuildOptions): Promise<BuildImageResult> {
  const { repoPath, timeout = 300000, verbose = false, llmOptimize = false, llmProvider = 'openai' } = options;
  
  // Validate input
  if (!repoPath) {
    return {
      ports: {},
      success: false,
      error: 'Repository path is required'
    };
  }
  
  if (!existsSync(repoPath)) {
    return {
      ports: {},
      success: false,
      error: `Repository path does not exist: ${repoPath}`
    };
  }
  
  // Determine the path to the Go binary
  const binaryPath = await getDaggerBinaryPath();
  if (!binaryPath) {
    return {
      ports: {},
      success: false,
      error: 'Dagger Go binary not found. Please build the binary first with: cd dagger-runner && go build -o nexlayer-dagger-runner'
    };
  }
  
  if (verbose) {
    process.stderr.write(`[DAGGER] Using binary: ${binaryPath}\n`);
    process.stderr.write(`[DAGGER] Building repo: ${repoPath}\n`);
  }
  
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    
    // Build arguments for Go binary
    const args = [repoPath];
    if (llmOptimize) {
      args.push('--llm-optimize');
      args.push(`--llm-provider=${llmProvider}`);
    }
    
    // Spawn the Go binary
    const child = spawn(binaryPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Ensure Dagger can access Docker and LLM APIs
        PATH: process.env.PATH,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      }
    });
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        ports: {},
        success: false,
        error: `Build process timed out after ${timeout}ms`
      });
    }, timeout);
    
    // Collect stdout (JSON result)
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Collect stderr (logs)
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      if (verbose) {
        process.stderr.write(`[DAGGER] ${data.toString()}`);
      }
    });
    
    // Handle process completion
    child.on('close', (code) => {
      clearTimeout(timeoutId);
      
      if (code !== 0) {
        resolve({
          ports: {},
          success: false,
          error: `Build process failed with code ${code}. Stderr: ${stderr}`
        });
        return;
      }
      
      try {
        // Parse the JSON result from stdout
        const result = JSON.parse(stdout.trim());
        
        if (result.error) {
          resolve({
            ports: result.ports || {},
            success: false,
            error: result.error
          });
          return;
        }
        
        resolve({
          clientImage: result.client,
          serverImage: result.server,
          ports: result.ports || {},
          success: true
        });
      } catch (parseError) {
        resolve({
          ports: {},
          success: false,
          error: `Failed to parse build result: ${parseError}. Raw output: ${stdout}`
        });
      }
    });
    
    // Handle spawn errors
    child.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({
        ports: {},
        success: false,
        error: `Failed to spawn build process: ${error.message}`
      });
    });
  });
}

/**
 * Find the Dagger Go binary path
 */
async function getDaggerBinaryPath(): Promise<string | null> {
  // First, try the compiled binary in the dagger-runner directory
  // From dist/src/services/ we need to go up 3 levels to reach project root
  const projectRoot = join(__dirname, '../../..');
  const localBinary = join(projectRoot, 'dagger-runner', 'nexlayer-dagger-runner');
  
  if (existsSync(localBinary)) {
    return localBinary;
  }
  
  // Try common locations for a system-installed binary
  const systemLocations = [
    '/usr/local/bin/nexlayer-dagger-runner',
    '/usr/bin/nexlayer-dagger-runner',
    join(process.env.HOME || '', 'bin', 'nexlayer-dagger-runner')
  ];
  
  for (const location of systemLocations) {
    if (existsSync(location)) {
      return location;
    }
  }
  
  return null;
}

/**
 * Build the Go binary if it doesn't exist
 */
export async function ensureDaggerBinary(verbose = false): Promise<{ success: boolean; error?: string }> {
  const binaryPath = await getDaggerBinaryPath();
  if (binaryPath) {
    return { success: true };
  }
  
  const projectRoot = join(__dirname, '../../..');
  const daggerDir = join(projectRoot, 'dagger-runner');
  
  if (!existsSync(daggerDir)) {
    return {
      success: false,
      error: 'Dagger runner directory not found'
    };
  }
  
  if (verbose) {
    process.stderr.write(`[DAGGER] Building Go binary in ${daggerDir}\n`);
  }
  
  return new Promise((resolve) => {
    const child = spawn('go', ['build', '-o', 'nexlayer-dagger-runner'], {
      cwd: daggerDir,
      stdio: verbose ? 'inherit' : 'pipe'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: `Failed to build Go binary (exit code: ${code})`
        });
      }
    });
    
    child.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to build Go binary: ${error.message}`
      });
    });
  });
}

/**
 * Clone a repository and build images in one step
 */
export async function cloneAndBuild(repoUrl: string, options: { verbose?: boolean } = {}): Promise<BuildImageResult & { repoPath?: string }> {
  const { verbose = false } = options;
  
  // Generate unique directory for this build
  const { v4: uuidv4 } = await import('uuid');
  const buildId = uuidv4().substring(0, 8);
  const repoPath = join('/tmp', `liz-repo-${buildId}`);
  
  if (verbose) {
    process.stderr.write(`[DAGGER] Cloning ${repoUrl} to ${repoPath}\n`);
  }
  
  // Clone the repository
  const cloneResult = await cloneRepository(repoUrl, repoPath, verbose);
  if (!cloneResult.success) {
    return {
      ports: {},
      success: false,
      error: cloneResult.error
    };
  }
  
  // Build and push images
  const buildResult = await buildAndPushImages({ repoPath, verbose });
  
  return {
    ...buildResult,
    repoPath
  };
}

/**
 * Clone a Git repository
 */
async function cloneRepository(repoUrl: string, targetPath: string, verbose = false): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', ['clone', repoUrl, targetPath], {
      stdio: verbose ? 'inherit' : 'pipe'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: `Failed to clone repository (exit code: ${code})`
        });
      }
    });
    
    child.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to clone repository: ${error.message}`
      });
    });
  });
}

/**
 * Clean up temporary repository directory
 */
export async function cleanupRepo(repoPath: string): Promise<void> {
  if (repoPath.startsWith('/tmp/liz-repo-')) {
    try {
      const { spawn } = await import('child_process');
      spawn('rm', ['-rf', repoPath], { stdio: 'ignore' });
    } catch (error) {
      // Ignore cleanup errors
      process.stderr.write(`[DAGGER] Warning: Failed to cleanup ${repoPath}: ${error}\n`);
    }
  }
}