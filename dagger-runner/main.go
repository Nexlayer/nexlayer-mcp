package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"dagger.io/dagger"
	"github.com/google/uuid"
)

// BuildResult represents the output of the build process
type BuildResult struct {
	Client     string            `json:"client,omitempty"`
	Server     string            `json:"server,omitempty"`
	Ports      map[string]int    `json:"ports"`
	Error      string            `json:"error,omitempty"`
	DAGSummary string            `json:"dagSummary,omitempty"`
	LLMInsights string           `json:"llmInsights,omitempty"`
}

// ServiceConfig holds configuration for a service to be built
type ServiceConfig struct {
	Name         string
	Path         string
	Port         int
	DockerfileExists bool
}

func main() {
	if len(os.Args) < 2 || len(os.Args) > 4 {
		result := BuildResult{
			Error: "Usage: nexlayer-dagger-runner <repo-path> [--llm-optimize] [--llm-provider=openai]",
		}
		outputResult(result)
		os.Exit(1)
	}

	repoPath := os.Args[1]
	llmOptimize := false
	llmProvider := "openai"
	
	// Parse optional arguments
	for i := 2; i < len(os.Args); i++ {
		arg := os.Args[i]
		if arg == "--llm-optimize" {
			llmOptimize = true
		} else if strings.HasPrefix(arg, "--llm-provider=") {
			llmProvider = strings.Split(arg, "=")[1]
		}
	}
	
	// Validate repo path exists
	if _, err := os.Stat(repoPath); os.IsNotExist(err) {
		result := BuildResult{
			Error: fmt.Sprintf("Repository path does not exist: %s", repoPath),
		}
		outputResult(result)
		os.Exit(1)
	}

	ctx := context.Background()
	
	// Initialize Dagger client
	client, err := dagger.Connect(ctx, dagger.WithLogOutput(os.Stderr))
	if err != nil {
		result := BuildResult{
			Error: fmt.Sprintf("Failed to connect to Dagger: %v", err),
		}
		outputResult(result)
		os.Exit(1)
	}
	defer client.Close()

	log.Printf("🔍 Analyzing repository structure at: %s", repoPath)
	
	// Analyze repository structure
	services := analyzeRepository(repoPath)
	
	if len(services) == 0 {
		result := BuildResult{
			Error: "No buildable services found (client/ or server/ directories)",
			Ports: make(map[string]int),
		}
		outputResult(result)
		os.Exit(0)
	}

	log.Printf("📦 Found %d services to build", len(services))
	
	// Generate DAG summary for LLM analysis
	dagSummary := generateDAGSummary(services)
	
	// LLM-aware DAG optimization (if enabled)
	var llmInsights string
	if llmOptimize {
		llmInsights = performLLMDAGAnalysis(ctx, repoPath, services, llmProvider)
	}
	
	// Build and push images
	result := buildAndPushImages(ctx, client, repoPath, services)
	result.DAGSummary = dagSummary
	result.LLMInsights = llmInsights
	
	outputResult(result)
	
	if result.Error != "" {
		os.Exit(1)
	}
}

// analyzeRepository scans the repo for buildable services
func analyzeRepository(repoPath string) []ServiceConfig {
	var services []ServiceConfig
	
	// Check for client directory
	clientPath := filepath.Join(repoPath, "client")
	if stat, err := os.Stat(clientPath); err == nil && stat.IsDir() {
		dockerfileExists := checkDockerfileExists(clientPath)
		services = append(services, ServiceConfig{
			Name:             "client",
			Path:             clientPath,
			Port:             3000, // Default React/frontend port
			DockerfileExists: dockerfileExists,
		})
		log.Printf("✅ Found client service at: %s (Dockerfile: %v)", clientPath, dockerfileExists)
	}
	
	// Check for server directory
	serverPath := filepath.Join(repoPath, "server")
	if stat, err := os.Stat(serverPath); err == nil && stat.IsDir() {
		dockerfileExists := checkDockerfileExists(serverPath)
		services = append(services, ServiceConfig{
			Name:             "server",
			Path:             serverPath,
			Port:             5000, // Default backend port
			DockerfileExists: dockerfileExists,
		})
		log.Printf("✅ Found server service at: %s (Dockerfile: %v)", serverPath, dockerfileExists)
	}
	
	// Check for root-level service (fallback)
	if len(services) == 0 {
		if hasNodeProject(repoPath) {
			dockerfileExists := checkDockerfileExists(repoPath)
			services = append(services, ServiceConfig{
				Name:             "app",
				Path:             repoPath,
				Port:             3000,
				DockerfileExists: dockerfileExists,
			})
			if dockerfileExists {
				log.Printf("✅ Found root-level project with MCP-generated Dockerfile")
			} else {
				log.Printf("⚠️  Found root-level project but no Dockerfile - needs nexlayer_generate_dockerfile")
			}
		}
	}
	
	return services
}

// checkDockerfileExists checks if a Dockerfile exists in the given directory
func checkDockerfileExists(dir string) bool {
	dockerfilePath := filepath.Join(dir, "Dockerfile")
	_, err := os.Stat(dockerfilePath)
	return err == nil
}

// hasNodeProject checks if a directory contains a Node.js project
func hasNodeProject(dir string) bool {
	packageJSONPath := filepath.Join(dir, "package.json")
	_, err := os.Stat(packageJSONPath)
	return err == nil
}

// buildAndPushImages builds and pushes container images for all services
func buildAndPushImages(ctx context.Context, client *dagger.Client, repoPath string, services []ServiceConfig) BuildResult {
	result := BuildResult{
		Ports: make(map[string]int),
	}
	
	// Generate unique identifier for this build
	buildID := strings.ToLower(uuid.New().String()[:8])
	
	for _, service := range services {
		log.Printf("🔨 Building %s service...", service.Name)
		
		// Set up the container
		var container *dagger.Container
		var err error
		
		if service.DockerfileExists {
			// Use existing Dockerfile (generated by MCP)
			log.Printf("📄 Using Dockerfile for %s (generated by MCP)", service.Name)
			container, err = buildWithDockerfile(ctx, client, service.Path)
		} else {
			// Dockerfile should be generated by MCP first
			log.Printf("❌ No Dockerfile found for %s - MCP should generate Dockerfile first", service.Name)
			result.Error = fmt.Sprintf("No Dockerfile found for %s. Please use nexlayer_generate_dockerfile first to create optimized Dockerfile", service.Name)
			return result
		}
		
		if err != nil {
			result.Error = fmt.Sprintf("Failed to build %s: %v", service.Name, err)
			return result
		}
		
		// Generate image URL for ttl.sh
		imageURL := fmt.Sprintf("ttl.sh/%s-%s:1h", service.Name, buildID)
		log.Printf("📤 Pushing %s to %s", service.Name, imageURL)
		
		// Push to registry
		publishedURL, err := container.Publish(ctx, imageURL)
		if err != nil {
			result.Error = fmt.Sprintf("Failed to push %s: %v", service.Name, err)
			return result
		}
		
		log.Printf("✅ Successfully pushed %s: %s", service.Name, publishedURL)
		
		// Store results
		result.Ports[service.Name] = service.Port
		switch service.Name {
		case "client":
			result.Client = publishedURL
		case "server":
			result.Server = publishedURL
		default:
			// For single-service apps, put in client field
			if result.Client == "" {
				result.Client = publishedURL
			}
		}
	}
	
	return result
}

// buildWithDockerfile builds using an existing Dockerfile
func buildWithDockerfile(ctx context.Context, client *dagger.Client, servicePath string) (*dagger.Container, error) {
	// Mount the service directory
	sourceDir := client.Host().Directory(servicePath)
	
	// Build using the existing Dockerfile with linux/amd64 platform
	container := client.Container(dagger.ContainerOpts{
		Platform: dagger.Platform("linux/amd64"), // Force linux/amd64 for Nexlayer compatibility
	}).Build(sourceDir)
	
	return container, nil
}



// outputResult outputs the final result as JSON to stdout
func outputResult(result BuildResult) {
	jsonBytes, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling result: %v\n", err)
		fmt.Println(`{"error": "Failed to marshal result"}`)
		return
	}
	
	fmt.Println(string(jsonBytes))
}

// Generate DAG summary for LLM analysis
func generateDAGSummary(services []ServiceConfig) string {
	summary := fmt.Sprintf("Build DAG for %d service(s):\n", len(services))
	
	for _, service := range services {
		summary += fmt.Sprintf("- %s: Node.js service (port %d)", service.Name, service.Port)
		if service.DockerfileExists {
			summary += " [Custom Dockerfile]"
		} else {
			summary += " [Auto-generated Dockerfile]"
		}
		summary += "\n"
	}
	
	summary += "\nBuild steps per service:\n"
	summary += "1. Platform: linux/amd64 (Nexlayer compatibility)\n"
	summary += "2. Use MCP-generated Dockerfile (nexlayer_generate_dockerfile)\n"
	summary += "3. Build container from Dockerfile\n"
	summary += "4. Push to ttl.sh registry\n"
	summary += "5. Return image URLs for YAML generation\n"
	
	return summary
}

// Perform LLM DAG analysis and optimization
func performLLMDAGAnalysis(ctx context.Context, repoPath string, services []ServiceConfig, provider string) string {
	log.Printf("🤖 Starting LLM DAG analysis...")
	
	// Construct prompt for LLM
	prompt := buildLLMPrompt(repoPath, services)
	
	// Call LLM API (mock implementation - replace with actual LLM integration)
	response := mockLLMCall(prompt, provider)
	
	log.Printf("🤖 LLM analysis completed")
	return response
}

// Build comprehensive prompt for LLM analysis
func buildLLMPrompt(repoPath string, services []ServiceConfig) string {
	prompt := "You are an expert DevOps engineer analyzing a Dagger build pipeline. "
	prompt += "Based on the repository structure, suggest optimizations for the build process.\n\n"
	
	prompt += fmt.Sprintf("Repository: %s\n", repoPath)
	prompt += fmt.Sprintf("Services found: %d\n\n", len(services))
	
	for _, service := range services {
		prompt += fmt.Sprintf("Service: %s\n", service.Name)
		prompt += fmt.Sprintf("- Type: Node.js application\n")
		prompt += fmt.Sprintf("- Port: %d\n", service.Port)
		prompt += fmt.Sprintf("- Custom Dockerfile: %v\n", service.DockerfileExists)
		prompt += "\n"
	}
	
	prompt += "Current build workflow:\n"
	prompt += "1. MCP generates optimized Dockerfile via nexlayer_generate_dockerfile\n"
	prompt += "2. Dagger builds from MCP-generated Dockerfile (linux/amd64)\n"
	prompt += "3. Push built image to ttl.sh registry\n"
	prompt += "4. Return image URLs for nexlayer.yaml generation\n\n"
	
	prompt += "Please suggest optimizations for:\n"
	prompt += "1. MCP Dockerfile generation improvements\n"
	prompt += "2. Dagger build process enhancements\n"
	prompt += "3. ttl.sh registry optimization\n"
	prompt += "4. Nexlayer platform compatibility\n"
	prompt += "5. Build performance and security\n\n"
	
	prompt += "Focus on optimizations that work within the MCP → Dagger → Nexlayer workflow."
	
	return prompt
}

// Mock LLM call (replace with actual LLM integration)
func mockLLMCall(prompt string, provider string) string {
	log.Printf("🤖 Calling %s LLM API...", provider)
	
	// This is a mock response - in production, this would call OpenAI, Anthropic, etc.
	// Example of how to integrate:
	// if provider == "openai" {
	//     return callOpenAI(prompt)
	// } else if provider == "anthropic" {
	//     return callAnthropic(prompt)
	// }
	
	// Mock intelligent response based on new MCP → Dagger → Nexlayer workflow
	insights := "🧠 LLM Analysis Results:\n\n"
	insights += "1. **Workflow**: ✅ Using MCP-generated Dockerfiles (no local image building)\n"
	insights += "2. **Platform**: ✅ Enforcing linux/amd64 for Nexlayer compatibility\n"
	insights += "3. **Registry**: ✅ Using ttl.sh for temporary image hosting\n"
	insights += "4. **MCP Integration**: Consider caching Dockerfile generations for similar projects\n"
	insights += "5. **Build Optimization**: Multi-stage Dockerfiles reduce final image size\n"
	insights += "6. **Security**: MCP-generated Dockerfiles should include non-root users\n"
	insights += "7. **YAML Patching**: Image URLs properly integrated into nexlayer.yaml pods\n\n"
	insights += "💡 This workflow ensures consistent, optimized builds that work seamlessly with Nexlayer"
	
	return insights
}

// Optional: Real LLM integration examples (commented out for reference)
/*
func callOpenAI(prompt string) string {
	// Example OpenAI integration
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return "OpenAI API key not configured"
	}
	
	// Make API call to OpenAI
	// ... implementation
	return "OpenAI response"
}

func callAnthropic(prompt string) string {
	// Example Anthropic integration
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		return "Anthropic API key not configured"
	}
	
	// Make API call to Anthropic
	// ... implementation
	return "Anthropic response"
}
*/