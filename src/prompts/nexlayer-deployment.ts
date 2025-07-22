/**
 * Nexlayer Deployment Prompts
 * Clean 6-step deployment workflow guidance for AI agents
 */

import { z } from "zod";
import { ToolRegistry } from '../tools/registry.js';

export class NexlayerDeploymentPrompts {
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
    this.registerPrompts();
  }

  private registerPrompts(): void {
    this.registerDeploymentWorkflow();
    this.registerTroubleshootingGuide();
  }

  private registerDeploymentWorkflow(): void {
    this.registry.registerPrompt(
      "nexlayer-deployment-workflow",
      {
        title: "Nexlayer 6-Step Deployment Workflow",
        description: "Guide AI agents through deploying a GitHub repository to Nexlayer with a streamlined process",
        argsSchema: {
          userRequest: z.string().describe("User's deployment request"),
          repositoryUrl: z.string().optional().describe("GitHub repository URL if provided")
        }
      },
      ({ userRequest, repositoryUrl }) => {
        // Handle missing repository URL
        if (!repositoryUrl || repositoryUrl.trim() === '') {
          return {
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `# Welcome to Nexlayer Deployment! 🌐

**User Request:** "${userRequest}"

Nexlayer is a cloud platform that makes it easy to deploy and manage your applications. I’m here to help you deploy your GitHub repository in just a few steps!

---

### 🔗 Step 1: Provide Your GitHub Repository URL

I need the URL of your GitHub repository to get started. It’s the web address where your project lives on GitHub.

- **Example:** \`https://github.com/your-username/your-project\`
- **Tip:** Make sure your repository is public or you have permission to access it.

**How to Proceed:**
- Type your repository URL in the chat, like this: "Deploy https://github.com/your-username/your-project to Nexlayer"

If you’re unsure how to find your repository URL, just ask—I’ll guide you!

---

### What Happens Next?

Once you provide the URL, I’ll follow this **6-Step Deployment Process**:

1. **Clone Your Repository** 📥 - Download your project files.
2. **Analyze Your Project** 🔍 - Check your project’s structure and needs.
3. **Generate Dockerfiles** 🐳 - Create files to containerize your app.
4. **Build and Push Images** 🏗️ - Build and store your app’s containers.
5. **Create Nexlayer Configuration** 📝 - Set up deployment details.
6. **Deploy to Nexlayer** 🚀 - Launch your app on the cloud!

Ready? Please share your GitHub repository URL to begin!`
                }
              }
            ]
          };
        }

        // Full deployment workflow when repository URL is provided
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `# Nexlayer Deployment Assistant 🚀

Hello! I’m your Nexlayer deployment assistant, here to deploy your GitHub repository to the Nexlayer cloud platform using a clean 6-step process.

**User Request:** "${userRequest}"  
**Repository URL:** ${repositoryUrl}

---

## 🌟 The 6-Step Deployment Process

I’ll use these tools to get your application live:

### Phase 1: Clone & Analyze
1. **Clone Your Repository** 📥  
   - **Tool:** \`nexlayer_clone_repo\`  
   - Downloads your project files from ${repositoryUrl}.

2. **Analyze Your Project** 🔍  
   - **Tool:** \`nexlayer_analyze_repository\`  
   - Examines your project’s structure, dependencies, and setup. Returns JSON with services, ports, and more.

### Phase 2: Prepare & Build
3. **Generate Dockerfiles** 🐳  
   - **Tool:** \`nexlayer_generate_dockerfile\`  
   - Creates optimized Dockerfiles to containerize your app.

4. **Build and Push Images** 🏗️  
   - **Tool:** \`nexlayer_build_images\`  
   - Builds container images and pushes them to a registry (ttl.sh). Returns image URLs.

### Phase 3: Configure & Deploy
5. **Create Nexlayer Configuration** 📝  
   - **Tool:** \`nexlayer_generate_intelligent_yaml\`  
   - Generates a YAML file for Nexlayer using analysis and image data.

6. **Deploy to Nexlayer** 🚀  
   - **Tool:** \`nexlayer_deploy\`  
   - Deploys your app to Nexlayer via POST to /startUserDeployment. Returns a live URL.

---

## 🎯 How It Works
- **Step-by-Step:** I’ll ask for your confirmation at each step.  
- **Tool Flow:**  
  \`\`\`  
  nexlayer_clone_repo → nexlayer_analyze_repository → nexlayer_generate_dockerfile  
  → nexlayer_build_images → nexlayer_generate_intelligent_yaml → nexlayer_deploy  
  \`\`\`  
- **Time:** Your app will be live in ~2-5 minutes!

---

## 🔧 Quick Troubleshooting Tips
- **Clone Fails?** Check if ${repositoryUrl} is valid and accessible.  
- **Analysis Stuck?** Ensure your project has files like \`package.json\` or \`requirements.txt\`.  
- **Docker Issues?** Make sure your Docker daemon is running.  
- **Need Help?** Type "troubleshoot [step name]" (e.g., "troubleshoot clone").

---

**Ready to Start?**  
Let’s deploy ${repositoryUrl} to Nexlayer. Shall I begin with cloning your repository?`
              }
            }
          ]
        };
      }
    );
  }

  private registerTroubleshootingGuide(): void {
    this.registry.registerPrompt(
      "nexlayer-troubleshooting",
      {
        title: "Nexlayer Deployment Troubleshooting",
        description: "Guide for handling common deployment issues and error recovery",
        argsSchema: {
          error: z.string().describe("Error message or issue description"),
          step: z.enum(['clone', 'analyze', 'dockerfile', 'build', 'yaml', 'deploy']).optional().describe("Which step failed")
        }
      },
      ({ error, step }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `# Nexlayer Deployment Troubleshooting 🛠️

**Error:** "${error}"  
${step ? `**Failed Step:** ${step}` : ''}

Here’s how to resolve common issues at each deployment step:

---

## 🔧 Solutions by Step

1. **Clone Issues** (\`nexlayer_clone_repo\`)  
   - **Problem:** Invalid or inaccessible repository.  
   - **Fix:** Verify the URL is correct and public.  
   - **Example:** Ensure it’s \`https://github.com/user/repo\`.

2. **Analysis Issues** (\`nexlayer_analyze_repository\`)  
   - **Problem:** Project structure not recognized.  
   - **Fix:** Check for files like \`package.json\`, \`requirements.txt\`, or \`go.mod\`.

3. **Dockerfile Issues** (\`nexlayer_generate_dockerfile\`)  
   - **Problem:** Framework not detected.  
   - **Fix:** Confirm your project uses a supported framework (e.g., React, FastAPI).

4. **Build Issues** (\`nexlayer_build_images\`)  
   - **Problem:** Docker-related errors.  
   - **Fix:** Ensure Docker is running and connected to ttl.sh.

5. **YAML Issues** (\`nexlayer_generate_intelligent_yaml\`)  
   - **Problem:** Invalid configuration.  
   - **Fix:** Use lowercase, alphanumeric names with hyphens (e.g., \`my-app\`).

6. **Deployment Issues** (\`nexlayer_deploy\`)  
   - **Problem:** Image or config errors.  
   - **Fix:** Verify images were built and pushed successfully.

---

## 💡 Next Steps
- **Retry:** Apply the fix and retry the step.  
- **More Help:** Type "troubleshoot [step name]" for detailed guidance.  
- **Feedback:** If issues persist, I’ll notify the Nexlayer team automatically.

Let’s get your deployment back on track! What would you like to do next?`
            }
          }
        ]
      })
    );
  }
}