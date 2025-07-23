import {
  GenerateDockerfileParams,
  GenerateNexlayerYamlParams,
  GenerateFullStackParams as LocalFullStackParams,
  FileGenerationResult,
  PodConfig
} from "../types/nexlayer.js";

export class FileGenerator {
  /**
   * Generate a Dockerfile based on the specified parameters
   * @deprecated Use nexlayer_generate_intelligent_dockerfile for AI-powered analysis instead
   */
  generateDockerfile(params: GenerateDockerfileParams): string {
    const { type, baseImage, port = 3000, buildCommand, startCommand, dependencies, customDockerfile } = params;

    if (customDockerfile) {
      return customDockerfile;
    }

    // Simple fallback templates - for intelligent generation, use nexlayer_generate_intelligent_dockerfile
    return this.generateSimpleDockerfile(type, port, buildCommand, startCommand, dependencies, baseImage);
  }

  /**
   * Generate simple Dockerfile templates (fallback only)
   */
  private generateSimpleDockerfile(type: string, port: number, buildCommand?: string, startCommand?: string, _dependencies?: string[], baseImage?: string): string {
    switch (type) {
      case 'react':
        return `# Basic React Dockerfile - Use nexlayer_generate_intelligent_dockerfile for optimized version
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN ${buildCommand || 'npm run build'}

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
RUN echo 'server { listen ${port}; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE ${port}
CMD ["nginx", "-g", "daemon off;"]`;

      case 'next':
      case 'nextjs':
        return `# Basic Next.js Dockerfile - Use nexlayer_generate_intelligent_dockerfile for optimized version
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE ${port}
CMD ["npm", "start"]`;

      case 'node':
        return `# Basic Node.js Dockerfile - Use nexlayer_generate_intelligent_dockerfile for optimized version
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
${buildCommand ? `RUN ${buildCommand}` : ''}
EXPOSE ${port}
CMD ["${startCommand || 'npm start'}"]`;

      case 'python':
        return `# Basic Python Dockerfile - Use nexlayer_generate_intelligent_dockerfile for optimized version
FROM ${baseImage || 'python:3.11-slim'}
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE ${port}
CMD ["python", "app.py"]`;

      default:
        throw new Error(`Unsupported type: ${type}. Use nexlayer_generate_intelligent_dockerfile for comprehensive project analysis.`);
    }
  }

  /**
   * Generate a nexlayer.yaml file
   */
  generateNexlayerYaml(params: GenerateNexlayerYamlParams): string {
    const { applicationName, pods } = params;

    let yaml = `application:
  name: ${applicationName}
  description: ${applicationName} application

pods:`;

    for (const pod of pods) {
      yaml += `\n  - name: ${pod.name}`;
      yaml += `\n    image: ${pod.image}`;
      
      if (pod.servicePorts && pod.servicePorts.length > 0) {
        yaml += `\n    servicePorts:`;
        for (const port of pod.servicePorts) {
          yaml += `\n      - ${port}`;
        }
      }

      if (pod.vars && Object.keys(pod.vars).length > 0) {
        yaml += `\n    vars:`;
        for (const [key, value] of Object.entries(pod.vars)) {
          yaml += `\n      ${key}: ${value}`;
        }
      }
    }

    return yaml;
  }

  /**
   * Generate a complete full-stack project
   */
  generateFullStack(params: LocalFullStackParams): FileGenerationResult {
    const { appName, frontend, backend, database, openai } = params;
    const files: Array<{ name: string; path: string; content: string }> = [];
    const instructions: string[] = [];

    // Generate frontend files
    if (frontend) {
      const frontendFiles = this.generateFrontendFiles(appName, frontend);
      files.push(...frontendFiles);
      instructions.push(`Frontend (${frontend.type}) files generated in /frontend directory`);
    }

    // Generate backend files
    if (backend) {
      const backendFiles = this.generateBackendFiles(appName, backend);
      files.push(...backendFiles);
      instructions.push(`Backend (${backend.type}) files generated in /backend directory`);
    }

    // Generate database configuration
    if (database) {
      const dbFiles = this.generateDatabaseFiles(appName, database);
      files.push(...dbFiles);
      instructions.push(`Database (${database.type}) configuration generated`);
    }

    // Generate OpenAI integration
    if (openai) {
      const openaiFiles = this.generateOpenAIFiles(appName, openai);
      files.push(...openaiFiles);
      instructions.push('OpenAI integration configured');
    }

    // Generate Dockerfiles
    const dockerfiles = this.generateDockerfilesForFullStack(appName, frontend, backend);
    files.push(...dockerfiles);

    // Generate nexlayer.yaml
    const pods: PodConfig[] = [];
    if (frontend) {
      pods.push({
        name: `${appName}-frontend`,
        image: `ttl.sh/${appName}-frontend:1h`,
        path: '/', // Required field for frontend routing
        servicePorts: [frontend.port || 3000]
      });
    }
    if (backend) {
      pods.push({
        name: `${appName}-backend`,
        image: `ttl.sh/${appName}-backend:1h`,
        // No path field for backend services
        servicePorts: [backend.port || 8000]
      });
    }

    const yaml = this.generateNexlayerYaml({
      applicationName: appName,
      pods: pods
    });

    files.push({
      name: 'nexlayer.yaml',
      path: 'nexlayer.yaml',
      content: yaml
    });

    instructions.push('nexlayer.yaml generated for deployment');

    return {
      files,
      instructions: instructions.join('\n')
    };
  }

  // Private helper methods for generating full-stack project files
  private generateFrontendFiles(appName: string, frontend: any): Array<{ name: string; path: string; content: string }> {
    const files: Array<{ name: string; path: string; content: string }> = [];
    
    switch (frontend.type) {
      case 'react':
        files.push(
          {
            name: 'package.json',
            path: 'frontend/package.json',
            content: this.generateReactPackageJson(appName)
          },
          {
            name: 'App.js',
            path: 'frontend/src/App.js',
            content: this.generateReactAppJs(appName)
          },
          {
            name: 'index.html',
            path: 'frontend/public/index.html',
            content: this.generateReactIndexHtml(appName)
          }
        );
        break;
      case 'vue':
        files.push(
          {
            name: 'package.json',
            path: 'frontend/package.json',
            content: this.generateVuePackageJson(appName)
          },
          {
            name: 'App.vue',
            path: 'frontend/src/App.vue',
            content: this.generateVueAppVue(appName)
          }
        );
        break;
      case 'next':
        files.push(
          {
            name: 'package.json',
            path: 'frontend/package.json',
            content: this.generateNextPackageJson(appName)
          },
          {
            name: 'page.tsx',
            path: 'frontend/app/page.tsx',
            content: this.generateNextPageTsx(appName)
          }
        );
        break;
    }
    
    return files;
  }

  private generateBackendFiles(appName: string, backend: any): Array<{ name: string; path: string; content: string }> {
    const files: Array<{ name: string; path: string; content: string }> = [];
    
    switch (backend.type) {
      case 'node':
        files.push(
          {
            name: 'package.json',
            path: 'backend/package.json',
            content: this.generateNodePackageJson(appName)
          },
          {
            name: 'app.js',
            path: 'backend/app.js',
            content: this.generateNodeAppJs(appName, backend.port || 8000)
          }
        );
        break;
      case 'python':
        files.push(
          {
            name: 'requirements.txt',
            path: 'backend/requirements.txt',
            content: this.generatePythonRequirements(appName)
          },
          {
            name: 'app.py',
            path: 'backend/app.py',
            content: this.generatePythonAppPy(appName, backend.port || 8000)
          }
        );
        break;
      case 'go':
        files.push(
          {
            name: 'go.mod',
            path: 'backend/go.mod',
            content: this.generateGoMod(appName)
          },
          {
            name: 'main.go',
            path: 'backend/main.go',
            content: this.generateGoMainGo(appName, backend.port || 8000)
          }
        );
        break;
    }
    
    return files;
  }

  private generateDatabaseFiles(appName: string, database: any): Array<{ name: string; path: string; content: string }> {
    const files: Array<{ name: string; path: string; content: string }> = [];
    
    switch (database.type) {
      case 'postgres':
        files.push({
          name: 'database.sql',
          path: 'database/init.sql',
          content: this.generatePostgresInitSql(appName)
        });
        break;
      case 'mysql':
        files.push({
          name: 'database.sql',
          path: 'database/init.sql',
          content: this.generateMysqlInitSql(appName)
        });
        break;
      case 'mongodb':
        files.push({
          name: 'database.js',
          path: 'database/init.js',
          content: this.generateMongoInitJs(appName)
        });
        break;
    }
    
    return files;
  }

  private generateOpenAIFiles(appName: string, openai: any): Array<{ name: string; path: string; content: string }> {
    return [
      {
        name: 'openai-config.js',
        path: 'config/openai.js',
        content: this.generateOpenAIConfig(appName, openai.apiKey || 'your-api-key-here')
      }
    ];
  }

  private generateDockerfilesForFullStack(appName: string, frontend?: any, backend?: any): Array<{ name: string; path: string; content: string }> {
    const files: Array<{ name: string; path: string; content: string }> = [];
    
    if (frontend) {
      files.push({
        name: 'Dockerfile.frontend',
        path: 'frontend/Dockerfile',
        content: this.generateDockerfile({
          name: `${appName}-frontend`,
          type: frontend.type,
          port: frontend.port || 3000
        })
      });
    }
    
    if (backend) {
      files.push({
        name: 'Dockerfile.backend',
        path: 'backend/Dockerfile',
        content: this.generateDockerfile({
          name: `${appName}-backend`,
          type: backend.type,
          port: backend.port || 8000
        })
      });
    }
    
    return files;
  }

  // Template generators for various file types
  private generateReactPackageJson(appName: string): string {
    return `{
  "name": "${appName}-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.6.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}`;
  }

  private generateReactAppJs(appName: string): string {
    return `import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch('/api/hello')
      .then(response => response.json())
      .then(data => setMessage(data.message))
      .catch(error => setMessage('Error connecting to backend'));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to ${appName}!</h1>
        <p>{message}</p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;`;
  }

  private generateReactIndexHtml(appName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="${appName} - Full Stack Application"
    />
    <title>${appName}</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;
  }

  private generateVuePackageJson(appName: string): string {
    return `{
  "name": "${appName}-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "serve": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "lint": "vue-cli-service lint"
  },
  "dependencies": {
    "vue": "^3.3.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vue/cli-service": "^5.0.0",
    "@vue/compiler-sfc": "^3.3.0"
  }
}`;
  }

  private generateVueAppVue(appName: string): string {
    return `<template>
  <div id="app">
    <h1>Welcome to {{ appName }}!</h1>
    <p>{{ message }}</p>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'App',
  data() {
    return {
      appName: '${appName}',
      message: 'Loading...'
    };
  },
  async mounted() {
    try {
      const response = await axios.get('/api/hello');
      this.message = response.data.message;
    } catch (error) {
      this.message = 'Error connecting to backend';
    }
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>`;
  }

  private generateNextPackageJson(appName: string): string {
    return `{
  "name": "${appName}-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}`;
  }

  private generateNextPageTsx(appName: string): string {
    return `'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch('/api/hello')
      .then(response => response.json())
      .then(data => setMessage(data.message))
      .catch(error => setMessage('Error connecting to backend'));
  }, []);

  return (
    <main>
      <h1>Welcome to ${appName}!</h1>
      <p>{message}</p>
    </main>
  );
}`;
  }

  private generateNodePackageJson(appName: string): string {
    return `{
  "name": "${appName}-backend",
  "version": "1.0.0",
  "description": "Backend API for ${appName}",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}`;
  }

  private generateNodeAppJs(appName: string, port: number): string {
    return `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || ${port};

app.use(cors());
app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from ${appName} backend!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`${appName} backend server running on port \${PORT}\`);
});`;
  }

  private generatePythonRequirements(_appName: string): string {
    return `flask==2.3.0
flask-cors==4.0.0
python-dotenv==1.0.0
requests==2.31.0`;
  }

  private generatePythonAppPy(_appName: string, port: number): string {
    return `from flask import Flask, jsonify
from flask_cors import CORS
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/api/hello')
def hello():
    return jsonify({'message': f'Hello from {appName} backend!'})

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', ${port}))
    app.run(host='0.0.0.0', port=port)`;
  }

  private generateGoMod(appName: string): string {
    return `module ${appName}-backend

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/gin-contrib/cors v1.4.0
)`;
  }

  private generateGoMainGo(appName: string, port: number): string {
    return `package main

import (
    "net/http"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
)

func main() {
    r := gin.Default()
    
    r.Use(cors.Default())
    
    r.GET("/api/hello", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Hello from ${appName} backend!",
        })
    })
    
    r.GET("/api/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status": "healthy",
            "timestamp": time.Now().Format(time.RFC3339),
        })
    })
    
    r.Run(":${port}")
}`;
  }

  private generatePostgresInitSql(appName: string): string {
    return `-- Initialize PostgreSQL database for ${appName}

CREATE DATABASE IF NOT EXISTS ${appName}_db;
USE ${appName}_db;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
  }

  private generateMysqlInitSql(appName: string): string {
    return `-- Initialize MySQL database for ${appName}

CREATE DATABASE IF NOT EXISTS ${appName}_db;
USE ${appName}_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);`;
  }

  private generateMongoInitJs(appName: string): string {
    return `// Initialize MongoDB database for ${appName}

db = db.getSiblingDB('${appName}_db');

// Create collections
db.createCollection('users');
db.createCollection('posts');

// Create indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

// Insert sample data
db.users.insertOne({
    username: "admin",
    email: "admin@${appName}.com",
    created_at: new Date()
});

db.posts.insertOne({
    user_id: ObjectId(),
    title: "Welcome to ${appName}",
    content: "This is your first post!",
    created_at: new Date()
});`;
  }

  private generateOpenAIConfig(appName: string, apiKey: string): string {
    return `// OpenAI configuration for ${appName}

const OPENAI_CONFIG = {
    apiKey: '${apiKey}',
    model: 'gpt-3.5-turbo',
    maxTokens: 1000,
    temperature: 0.7
};

module.exports = OPENAI_CONFIG;`;
  }
} 