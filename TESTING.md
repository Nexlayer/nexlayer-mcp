# Testing the Nexlayer MCP Server with Cursor

This guide will help you test the Nexlayer MCP server with Cursor.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Cursor** with MCP support
3. **Nexlayer account** (for session tokens)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Build the Project

```bash
npm run build
```

## Step 3: Test the Build

```bash
node test-mcp.js
```

This will:
- Build the TypeScript project
- Test server imports
- Test YAML generation
- Verify everything is working

## Step 4: Configure Cursor

### Option A: Using Cursor Settings

1. Open Cursor
2. Go to **Settings** → **Extensions** → **MCP**
3. Add a new MCP server configuration:

```json
{
  "command": "node",
  "args": ["/path/to/your/nexlayer-mcp/dist/index.js"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Option B: Using Settings File

1. Find your Cursor settings file:
   - **macOS**: `~/Library/Application Support/Cursor/User/settings.json`
   - **Windows**: `%APPDATA%\Cursor\User\settings.json`
   - **Linux**: `~/.config/Cursor/User/settings.json`

2. Add the MCP configuration:

```json
{
  "mcp.servers": {
    "nexlayer": {
      "command": "node",
      "args": ["/path/to/your/nexlayer-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Step 5: Get a Nexlayer Session Token

1. Go to [Nexlayer](https://docs.nexlayer.com/)
2. Sign up or log in
3. Get your session token from the dashboard

## Step 6: Test the Tools

Once configured, you can test the tools in Cursor:

### Test 1: Validate YAML
```typescript
// Test YAML validation
{
  "yamlContent": `
application:
  name: "test-app"
  pods:
    - name: "frontend"
      image: "nextjs:latest"
      servicePorts:
        - 3000
  `
}
```

### Test 2: Get Schema
```typescript
// Get the YAML schema
{}
```

### Test 3: Deploy Application (with session token)
```typescript
// Deploy a simple app
{
  "name": "my-test-app",
  "image": "nginx:alpine",
  "servicePorts": [80],
  "sessionToken": "your-nexlayer-session-token"
}
```

## Step 7: Verify in Cursor

1. Open a new chat in Cursor
2. The MCP tools should appear in the available tools list
3. Try using them with commands like:
   - "Deploy a Next.js application"
   - "Add a PostgreSQL database"
   - "Create a full-stack application"

## Troubleshooting

### Build Issues
```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

### Import Issues
```bash
# Check if dist folder exists
ls -la dist/

# Check compiled JavaScript
cat dist/index.js
```

### Cursor Not Recognizing MCP
1. Restart Cursor
2. Check the MCP server logs in Cursor's developer console
3. Verify the path to your `dist/index.js` file

### API Errors
- Ensure you have a valid Nexlayer session token
- Check the [Nexlayer API documentation](https://docs.nexlayer.com/documentation/api-reference)
- Verify your internet connection

## Development Mode

For development, you can run the server directly:

```bash
npm run dev
```

This uses `tsx` to run TypeScript directly without building.

## Example Usage in Cursor

Once everything is set up, you can use the MCP server in Cursor like this:

```
User: "Deploy a Next.js application called 'my-blog' with environment variable NODE_ENV=production"

Cursor will use the deploy-application tool with:
{
  "name": "my-blog",
  "image": "nextjs:latest",
  "vars": {
    "NODE_ENV": "production"
  },
  "sessionToken": "your-token"
}
```

## Next Steps

1. **Test all tools** - Try each available tool
2. **Real deployments** - Deploy actual applications
3. **Custom configurations** - Modify the YAML generation
4. **Error handling** - Test error scenarios
5. **Performance** - Monitor API response times

## Support

- **Nexlayer Issues**: [Nexlayer Documentation](https://docs.nexlayer.com/)
- **MCP Issues**: [Model Context Protocol](https://modelcontextprotocol.io/)
- **Cursor Issues**: [Cursor Documentation](https://cursor.sh/docs) 