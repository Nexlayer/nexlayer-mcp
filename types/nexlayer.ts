// Type definitions for Nexlayer MCP server tool parameters

export interface NexlayerConfig {
  sessionToken?: string;
  baseUrl?: string;
}

// YAML deployment structure
export interface NexlayerYaml {
  application: {
    name: string;
    pods: PodConfig[];
  };
}

export interface PodConfig {
  name: string;
  image: string;
  path?: string; // Required for frontend pods, optional for backend
  servicePorts?: number[];
  vars?: Record<string, string>;
  secrets?: SecretConfig[];
}

export interface SecretConfig {
  name: string;
  data: string;
  mountPath: string;
  fileName: string;
}

// Local file generation interfaces
export interface GenerateDockerfileParams {
  name: string;
  type: 'node' | 'python' | 'go' | 'rust' | 'nextjs' | 'react' | 'vue' | 'angular' | 'next' | 'php' | 'java' | 'dotnet' | 'custom';
  baseImage?: string;
  port?: number;
  buildCommand?: string;
  startCommand?: string;
  dependencies?: string[];
  customDockerfile?: string;
}

export interface GenerateNexlayerYamlParams {
  applicationName: string;
  pods: PodConfig[];
  outputPath?: string;
}

export interface GenerateFullStackParams {
  appName: string;
  frontend: {
    type: 'nextjs' | 'react' | 'vue' | 'angular';
    port?: number;
  };
  backend: {
    type: 'node' | 'python' | 'go' | 'rust';
    port?: number;
    database?: boolean;
  };
  database?: {
    type: 'postgres' | 'mysql' | 'mongodb';
    port?: number;
  };
  openai?: {
    enabled: boolean;
    apiKey?: string;
  };
}

export interface FileGenerationResult {
  files: {
    name: string;
    content: string;
    path: string;
  }[];
  instructions: string;
}

// API Request/Response types based on actual Nexlayer API
export interface StartDeploymentParams {
  yamlContent: string;
  sessionToken?: string;
}

export interface ExtendDeploymentParams {
  sessionToken: string;
  applicationName: string;
}

export interface ClaimDeploymentParams {
  sessionToken: string;
  applicationName: string;
}

export interface AddDeploymentReservationParams {
  sessionToken: string;
  applicationName: string;
}

export interface RemoveDeploymentReservationParams {
  sessionToken: string;
  applicationName: string;
}

export interface GetReservationsParams {
  sessionToken: string;
}

export interface ValidateYamlParams {
  yamlContent: string;
}

export interface GetSchemaParams {
  // No parameters needed for schema endpoint
}

// Response types
export interface NexlayerApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DeploymentResult {
  sessionToken: string;
  applicationName: string;
  status: {
    environment?: string;
  };
  url?: string;
  message?: string;
  extend?: {
    message?: string;
    extendURL?: string;
  };
  claim?: {
    message?: string;
    claimURL?: string;
  };
  info?: string;
}

export interface Reservation {
  sessionToken: string;
  applicationName: string;
  createdAt: string;
  expiresAt: string;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: Array<{
    field?: string;
    message?: string;
  } | string>;
  warnings?: string[];
}

export interface SchemaResult {
  schema: object;
  version: string;
}

// Tool parameter interfaces for MCP
export interface DeployApplicationParams {
  name: string;
  image: string;
  servicePorts?: number[];
  vars?: Record<string, string>;
  sessionToken?: string;
}

export interface AddDatabaseParams {
  name?: string;
  image?: string;
  user: string;
  password: string;
  database: string;
  sessionToken?: string;
}

export interface AddPrismaBackendParams {
  name?: string;
  image: string;
  databaseUrl: string;
  path?: string;
  sessionToken?: string;
}

export interface AddOpenAIIntegrationParams {
  name?: string;
  image: string;
  openaiApiKey: string;
  sessionToken?: string;
}

export interface GetApplicationStatusParams {
  sessionToken: string;
  applicationName: string;
}

export interface ExtendDeploymentParams {
  sessionToken: string;
  applicationName: string;
}

export interface ClaimDeploymentParams {
  sessionToken: string;
  applicationName: string;
}

export interface ManageReservationParams {
  sessionToken: string;
  applicationName: string;
  action: 'add' | 'remove';
}

export interface GetReservationsParams {
  sessionToken: string;
}

export interface ValidateYamlParams {
  yamlContent: string;
}

export interface CreateFullStackParams {
  appName: string;
  frontendImage: string;
  backendImage: string;
  databaseImage?: string;
  sessionToken?: string;
} 