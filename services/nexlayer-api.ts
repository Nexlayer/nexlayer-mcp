import axios, { AxiosInstance } from 'axios';
import {
  NexlayerConfig,
  NexlayerApiResponse,
  DeploymentResult,
  Reservation,
  ValidationResult,
  SchemaResult,
  NexlayerYaml,
  PodConfig,
  StartDeploymentParams,
  ExtendDeploymentParams,
  ClaimDeploymentParams,
  AddDeploymentReservationParams,
  RemoveDeploymentReservationParams,
  GetReservationsParams,
  ValidateYamlParams,
} from '../types/nexlayer.js';

export class NexlayerApiClient {
  private client: AxiosInstance;
  private config: NexlayerConfig;

  constructor(config: NexlayerConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://app.nexlayer.io',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Send to stderr to avoid corrupting MCP JSON on stdout
        process.stderr.write(`[NEXLAYER-API] Error: ${error.response?.data || error.message}\n`);
        throw error;
      }
    );
  }

  // Start a user deployment with YAML
  async startUserDeployment(params: StartDeploymentParams): Promise<DeploymentResult> {
    try {
      // Debug logging
      process.stderr.write(`[NEXLAYER-API] Sending deployment request\n`);
      process.stderr.write(`[NEXLAYER-API] YAML Content Length: ${params.yamlContent.length}\n`);
      process.stderr.write(`[NEXLAYER-API] YAML Content Preview: ${params.yamlContent.substring(0, 200)}...\n`);
      process.stderr.write(`[NEXLAYER-API] Session Token: ${params.sessionToken ? 'Present' : 'None'}\n`);
      
      // Send YAML content directly in request body
      const response = await this.client.post<NexlayerApiResponse<DeploymentResult>>('/startUserDeployment', 
        params.yamlContent,
        {
          headers: {
            'Content-Type': 'text/yaml',
          },
          params: {
            sessionToken: params.sessionToken
          }
        }
      );

      // Debug logging
      process.stderr.write(`[NEXLAYER-API] Response Status: ${response.status}\n`);
      process.stderr.write(`[NEXLAYER-API] Response Data: ${JSON.stringify(response.data)}\n`);

      // Check if response exists
      if (!response.data) {
        throw new Error('No response data received from Nexlayer API');
      }

      // Handle different response formats
      const responseData = response.data;
      
      // Check if this is a success response with data
      if (responseData.data) {
        return responseData.data;
      }
      
      // Check if this is a success response without nested data
      if (responseData.success !== false && !responseData.error) {
        // This might be a direct success response
        return responseData as unknown as DeploymentResult;
      }
      
      // Check if this is an error response
      if (responseData.error || responseData.message) {
        const errorMsg = responseData.error || responseData.message || 'Unknown error';
        process.stderr.write(`[NEXLAYER-API] API Error: ${errorMsg}\n`);
        throw new Error(`API Error: ${errorMsg}`);
      }
      
      // If we get here, assume it's a success response
      return responseData as unknown as DeploymentResult;
    } catch (error: any) {
      // Enhanced error handling with detailed logging
      process.stderr.write(`[NEXLAYER-API] Error occurred: ${error.message}\n`);
      
      if (error.response) {
        // HTTP error response
        const errorData = error.response.data;
        const statusCode = error.response.status;
        const errorMessage = errorData?.error || errorData?.message || error.message;
        
        process.stderr.write(`[NEXLAYER-API] HTTP ${statusCode}: ${JSON.stringify(errorData)}\n`);
        throw new Error(`Failed to start deployment (HTTP ${statusCode}): ${errorMessage}`);
      } else if (error.request) {
        // Network error
        process.stderr.write(`[NEXLAYER-API] Network error: ${error.message}\n`);
        throw new Error(`Network error: Unable to reach Nexlayer API (${error.message})`);
      } else {
        // Other error
        process.stderr.write(`[NEXLAYER-API] Other error: ${error.message}\n`);
        throw new Error(`Deployment error: ${error.message}`);
      }
    }
  }

  // Extend a deployment
  async extendDeployment(params: ExtendDeploymentParams): Promise<DeploymentResult> {
    try {
      const response = await this.client.post<NexlayerApiResponse<DeploymentResult>>('/extendDeployment', {
        sessionToken: params.sessionToken,
        applicationName: params.applicationName,
      });

      return response.data.data!;
    } catch (error: any) {
      throw new Error(`Failed to extend deployment: ${error.response?.data?.error || error.message}`);
    }
  }

  // Claim a deployment
  async claimDeployment(params: ClaimDeploymentParams): Promise<DeploymentResult> {
    try {
      const response = await this.client.post<NexlayerApiResponse<DeploymentResult>>('/claimDeployment', {
        sessionToken: params.sessionToken,
        applicationName: params.applicationName,
      });

      return response.data.data!;
    } catch (error: any) {
      throw new Error(`Failed to claim deployment: ${error.response?.data?.error || error.message}`);
    }
  }

  // Add a deployment reservation
  async addDeploymentReservation(params: AddDeploymentReservationParams): Promise<void> {
    try {
      await this.client.post('/addDeploymentReservation', {
        sessionToken: params.sessionToken,
        applicationName: params.applicationName,
      });
    } catch (error: any) {
      throw new Error(`Failed to add deployment reservation: ${error.response?.data?.error || error.message}`);
    }
  }

  // Remove a deployment reservation
  async removeDeploymentReservation(params: RemoveDeploymentReservationParams): Promise<void> {
    try {
      await this.client.post('/removeDeploymentReservation', {
        sessionToken: params.sessionToken,
        applicationName: params.applicationName,
      });
    } catch (error: any) {
      throw new Error(`Failed to remove deployment reservation: ${error.response?.data?.error || error.message}`);
    }
  }

  // Remove all reservations
  async removeAllReservations(sessionToken: string): Promise<void> {
    try {
      await this.client.post('/removeReservations', {
        sessionToken,
      });
    } catch (error: any) {
      throw new Error(`Failed to remove all reservations: ${error.response?.data?.error || error.message}`);
    }
  }

  // Get all reservations
  async getReservations(params: GetReservationsParams): Promise<Reservation[]> {
    try {
      const response = await this.client.get<NexlayerApiResponse<Reservation[]>>('/getReservations', {
        params: {
          sessionToken: params.sessionToken,
        },
      });

      return response.data.data!;
    } catch (error: any) {
      throw new Error(`Failed to get reservations: ${error.response?.data?.error || error.message}`);
    }
  }

  // Get the nexlayer.yaml schema
  async getSchema(): Promise<SchemaResult> {
    try {
      const response = await this.client.get<NexlayerApiResponse<SchemaResult>>('/schema');
      return response.data.data!;
    } catch (error: any) {
      throw new Error(`Failed to get schema: ${error.response?.data?.error || error.message}`);
    }
  }

  // Validate a nexlayer.yaml file
  async validateYaml(params: ValidateYamlParams): Promise<ValidationResult> {
    try {
      const response = await this.client.post<NexlayerApiResponse<ValidationResult>>('/validate', {
        yamlContent: params.yamlContent,
      });

      return response.data.data!;
    } catch (error: any) {
      throw new Error(`Failed to validate YAML: ${error.response?.data?.error || error.message}`);
    }
  }

  // Send feedback
  async sendFeedback(feedback: string): Promise<void> {
    try {
      await this.client.post('/feedback', {
        feedback,
      });
    } catch (error: any) {
      throw new Error(`Failed to send feedback: ${error.response?.data?.error || error.message}`);
    }
  }

  // Helper method to generate YAML from parameters
  generateYaml(applicationName: string, pods: PodConfig[]): string {
    const yaml: NexlayerYaml = {
      application: {
        name: applicationName,
        pods: pods,
      },
    };

    return this.yamlToString(yaml);
  }

  // Helper method to convert YAML object to string
  private yamlToString(yaml: NexlayerYaml): string {
    let yamlString = `application:\n`;
    yamlString += `  name: "${yaml.application.name}"\n`;
    yamlString += `  pods:\n`;

    yaml.application.pods.forEach((pod) => {
      yamlString += `    - name: "${pod.name}"\n`;
      yamlString += `      image: "${pod.image}"\n`;
      
      // Only add path for frontend services
      if (pod.path) {
        yamlString += `      path: "${pod.path}"\n`;
      }
      
      if (pod.servicePorts && pod.servicePorts.length > 0) {
        yamlString += `      servicePorts:\n`;
        pod.servicePorts.forEach(port => {
          yamlString += `        - ${port}\n`;
        });
      }

      if (pod.vars && Object.keys(pod.vars).length > 0) {
        yamlString += `      vars:\n`;
        Object.entries(pod.vars).forEach(([key, value]) => {
          yamlString += `        ${key}: "${value}"\n`;
        });
      }

      if (pod.secrets && pod.secrets.length > 0) {
        yamlString += `      secrets:\n`;
        pod.secrets.forEach(secret => {
          yamlString += `        - name: "${secret.name}"\n`;
          yamlString += `          data: "${secret.data}"\n`;
          yamlString += `          mountPath: "${secret.mountPath}"\n`;
          yamlString += `          fileName: "${secret.fileName}"\n`;
        });
      }
    });

    return yamlString;
  }
} 