# Nexlayer Dagger Runner

A high-performance Go binary that uses Dagger to build and push container images for Nexlayer deployments.

## Overview

This Go binary provides advanced container building capabilities for the Nexlayer MCP server. It uses the Dagger SDK to:

- Detect client/server application structure
- Build optimized Docker images using Node.js 18
- Push images to ttl.sh registry with 1-hour expiration
- Return structured JSON results for MCP consumption

## Architecture

```
[ TypeScript MCP ] → [ Go Dagger Runner ] → [ Dagger SDK ] → [ Docker Images ]
        ↓                       ↓                 ↓              ↓
   buildAndPushImages()   CLI Interface      Container Build    ttl.sh Registry
```

## Prerequisites

- **Go 1.21+** - For building the binary
- **Docker** - Must be running and accessible
- **Dagger** - Included as Go dependency
- **Network Access** - To ttl.sh registry

## Building

```bash
# Navigate to dagger-runner directory
cd dagger-runner

# Run the build script
./build.sh

# Or build manually
go mod tidy
go build -o nexlayer-dagger-runner
```

## Usage

### CLI Interface

```bash
./nexlayer-dagger-runner /path/to/repository
```

### Expected Repository Structure

The runner detects these patterns:

```
my-repo/
├── client/          # Frontend application
│   ├── package.json
│   └── src/
├── server/          # Backend application
│   ├── package.json
│   └── src/
└── nexlayer.yaml    # Optional: existing config
```

Or single-service:

```
my-repo/
├── package.json     # Node.js application
├── src/
└── Dockerfile       # Optional: custom build
```

### Output Format

```json
{
  "client": "ttl.sh/client-abc123:1h",
  "server": "ttl.sh/server-abc123:1h", 
  "ports": {
    "client": 3000,
    "server": 5000
  }
}
```

On error:

```json
{
  "error": "Build failed: Docker daemon not running",
  "ports": {}
}
```

## Docker Image Generation

### With Existing Dockerfile

If a `Dockerfile` exists in the service directory, it's used as-is.

### Auto-Generated Dockerfile

For Node.js projects without Dockerfiles:

```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy package files first (better caching)
COPY package.json ./
COPY package-lock.json ./  # if exists

# Install dependencies
RUN npm ci  # or npm install

# Copy source code
COPY . .

# Build if build script exists
RUN npm run build  # if package.json has build script

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]  # or fallback commands
```

## Integration with MCP

The TypeScript MCP server calls this binary via `child_process.spawn`:

```typescript
// From src/services/buildAndPushImages.ts
const result = await buildAndPushImages({
  repoPath: '/tmp/liz-repo-123',
  verbose: true,
  timeout: 300000  // 5 minutes
});

console.log(result.clientImage);  // ttl.sh/client-abc123:1h
console.log(result.serverImage);  // ttl.sh/server-abc123:1h
```

## Dagger Pipeline

The build process follows this pipeline:

1. **Repository Analysis**
   - Scan for `client/` and `server/` directories
   - Check for existing Dockerfiles
   - Analyze `package.json` for scripts and dependencies

2. **Container Building**
   - Start with `node:18-alpine` base image
   - Copy package files for optimal Docker layer caching
   - Install dependencies (`npm ci` or `yarn install`)
   - Copy source code (excluding `node_modules`, `.git`)
   - Run build script if present
   - Set appropriate start command

3. **Image Publishing**
   - Generate unique image tags using UUID
   - Push to `ttl.sh` registry with 1-hour expiration
   - Return structured results to MCP

## Error Handling

The runner handles these common scenarios:

- **Missing directories**: Gracefully skips non-existent `client/` or `server/`
- **Docker daemon issues**: Returns clear error messages
- **Build failures**: Captures and reports specific build errors
- **Network issues**: Handles registry push failures
- **Invalid projects**: Detects missing `package.json` or build issues

## Performance Optimizations

- **Parallel builds**: Client and server images build concurrently
- **Docker layer caching**: Optimized Dockerfile structure
- **Minimal base images**: Uses Alpine Linux for smaller sizes
- **Build context filtering**: Excludes unnecessary files

## LLM-Aware DAG (Experimental)

The runner includes experimental support for LLM-powered build optimization:

```go
// Demonstration of potential LLM integration
func demonstrateLLMAwareness(ctx context.Context, client *dagger.Client, repoPath string) {
    // This would allow an LLM to inspect and optimize the build pipeline
    // llm, _ := dagger.NewLLM(ctx, dagger.LLMOpts{
    //     Provider: dagger.OpenAI,
    //     Model:    "gpt-4",
    // })
    // 
    // response, _ := llm.Chat(ctx, 
    //     "Should I optimize this build for production or development?")
}
```

## Registry Configuration

Currently uses `ttl.sh` (temporary registry):

- **Registry**: `ttl.sh`
- **Expiration**: 1 hour
- **Format**: `ttl.sh/{service}-{uuid}:1h`
- **Public access**: No authentication required

To use a different registry, modify the `buildAndPushImages` function:

```go
// Change this line in main.go
imageURL := fmt.Sprintf("your-registry.com/%s-%s:latest", service.Name, buildID)
```

## Troubleshooting

### Common Issues

1. **"Docker daemon not running"**
   ```bash
   # Start Docker Desktop or daemon
   sudo systemctl start docker  # Linux
   open -a Docker              # macOS
   ```

2. **"Build failed: permission denied"**
   ```bash
   # Add user to docker group (Linux)
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **"Network timeout pushing to registry"**
   ```bash
   # Check network connectivity
   curl -I ttl.sh
   # Increase timeout in MCP call
   ```

4. **"No buildable services found"**
   - Ensure repository has `client/` or `server/` directories
   - Or root-level `package.json` for single-service apps

### Debug Mode

Enable verbose logging in the MCP call:

```typescript
const result = await buildAndPushImages({
  repoPath: '/tmp/repo',
  verbose: true  // Shows detailed Dagger logs
});
```

## Security Considerations

- **Temporary images**: ttl.sh images expire automatically
- **No secrets**: Avoid embedding secrets in container images
- **Network access**: Runner needs internet access for registry
- **Docker socket**: Requires Docker daemon access

## Future Enhancements

- [ ] Support for multi-platform builds (ARM64, AMD64)
- [ ] Private registry authentication
- [ ] Custom Dockerfile templating
- [ ] Build caching optimization
- [ ] Kubernetes manifest generation
- [ ] Integration with CI/CD pipelines