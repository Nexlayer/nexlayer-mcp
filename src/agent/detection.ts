/**
 * AI Agent Detection Service
 * Handles transparent detection and classification of AI agents using the MCP
 */

export interface AgentContext {
  type: 'ai_agent' | 'human' | 'automation' | 'unknown';
  identity: string;
  client: string;
  capabilities: string[];
  session_id?: string;
}

export interface AgentCapabilities {
  file_system_access: boolean;
  structured_responses: boolean;
  batch_operations: boolean;
  auto_retry: boolean;
  project_context: boolean;
  code_generation: boolean;
}

export class AgentDetectionService {
  private static instance: AgentDetectionService;
  private agentContext: AgentContext;

  constructor() {
    this.agentContext = this.detectAgentContext();
    this.logAgentDetection();
  }

  static getInstance(): AgentDetectionService {
    if (!AgentDetectionService.instance) {
      AgentDetectionService.instance = new AgentDetectionService();
    }
    return AgentDetectionService.instance;
  }

  getAgentContext(): AgentContext {
    return this.agentContext;
  }

  getCapabilities(): AgentCapabilities {
    const caps = this.agentContext.capabilities;
    return {
      file_system_access: caps.includes('file_system_access'),
      structured_responses: caps.includes('structured_responses'),
      batch_operations: caps.includes('batch_operations'),
      auto_retry: caps.includes('auto_retry'),
      project_context: caps.includes('project_context'),
      code_generation: caps.includes('code_generation')
    };
  }

  private detectAgentContext(): AgentContext {
    // Detect from MCP runtime environment and process info
    const userAgent = process.env.MCP_USER_AGENT || '';
    const clientName = process.env.MCP_CLIENT_NAME || '';
    const sessionId = process.env.MCP_SESSION_ID || '';
    
    // Enhanced agent detection with fallback methods
    const termProgram = process.env.TERM_PROGRAM || '';
    const termProgramVersion = process.env.TERM_PROGRAM_VERSION || '';
    const vscodePid = process.env.VSCODE_PID;
    const cursorPid = process.env.CURSOR_PID;
    
    // MCP-based agent detection (primary method)
    // AI agents should self-identify through MCP_USER_AGENT and MCP_CLIENT_NAME
    
    // Claude Desktop detection (specific)
    if (userAgent.includes('claude-desktop') || 
        clientName.includes('claude-desktop') ||
        userAgent.includes('anthropic') ||
        clientName.includes('anthropic')) {
      return {
        type: 'ai_agent',
        identity: 'claude-desktop',
        client: 'claude-desktop',
        capabilities: ['structured_responses', 'batch_operations', 'auto_retry', 'project_context'],
        session_id: sessionId
      };
    }
    
    // Claude Code detection
    if (userAgent.includes('claude-code') || 
        clientName.includes('claude-code') ||
        userAgent.includes('claude') && userAgent.includes('code') ||
        clientName.includes('claude') && clientName.includes('code')) {
      return {
        type: 'ai_agent',
        identity: 'claude-code',
        client: 'claude-code',
        capabilities: ['file_system_access', 'project_context', 'code_generation', 'structured_responses'],
        session_id: sessionId
      };
    }
    
    // Cursor detection with multiple fallback methods
    if (userAgent.includes('cursor') || 
        clientName.includes('cursor') || 
        termProgram === 'vscode' && termProgramVersion.includes('cursor') ||
        cursorPid ||
        (termProgram === 'vscode' && termProgramVersion.includes('1.2'))) {
      return {
        type: 'ai_agent', 
        identity: 'cursor',
        client: 'cursor-ide',
        capabilities: ['file_system_access', 'project_context', 'code_generation'],
        session_id: sessionId
      };
    }
    
    // VS Code detection
    if (userAgent.includes('vscode') || 
        clientName.includes('vscode') || 
        termProgram === 'vscode' ||
        vscodePid) {
      return {
        type: 'ai_agent',
        identity: 'vscode',
        client: 'vscode-ide',
        capabilities: ['file_system_access', 'project_context', 'code_generation'],
        session_id: sessionId
      };
    }
    
    // Windsurf detection
    if (userAgent.includes('windsurf') || 
        clientName.includes('windsurf') ||
        userAgent.includes('wind') && userAgent.includes('surf')) {
      return {
        type: 'ai_agent',
        identity: 'windsurf', 
        client: 'windsurf-ide',
        capabilities: ['file_system_access', 'project_context', 'code_generation'],
        session_id: sessionId
      };
    }

    // GitHub Copilot detection
    if (userAgent.includes('copilot') || 
        clientName.includes('copilot') ||
        userAgent.includes('github') && userAgent.includes('copilot')) {
      return {
        type: 'ai_agent',
        identity: 'github-copilot',
        client: 'vscode-copilot',
        capabilities: ['file_system_access', 'code_generation', 'project_context'],
        session_id: sessionId
      };
    }
    
    // ChatGPT/OpenAI detection
    if (userAgent.includes('chatgpt') || 
        clientName.includes('chatgpt') ||
        userAgent.includes('openai') || 
        clientName.includes('openai') ||
        userAgent.includes('gpt') ||
        clientName.includes('gpt')) {
      return {
        type: 'ai_agent',
        identity: 'chatgpt',
        client: 'openai-chatgpt',
        capabilities: ['structured_responses', 'batch_operations'],
        session_id: sessionId
      };
    }
    
    // Perplexity detection
    if (userAgent.includes('perplexity') || 
        clientName.includes('perplexity') ||
        userAgent.includes('perplex') ||
        clientName.includes('perplex')) {
      return {
        type: 'ai_agent',
        identity: 'perplexity',
        client: 'perplexity-ai',
        capabilities: ['structured_responses', 'batch_operations'],
        session_id: sessionId
      };
    }
    
    // Google Gemini detection
    if (userAgent.includes('gemini') || 
        clientName.includes('gemini') ||
        userAgent.includes('google') && userAgent.includes('ai') ||
        clientName.includes('google') && clientName.includes('ai') ||
        userAgent.includes('bard') ||
        clientName.includes('bard')) {
      return {
        type: 'ai_agent',
        identity: 'gemini',
        client: 'google-gemini',
        capabilities: ['structured_responses', 'batch_operations', 'code_generation'],
        session_id: sessionId
      };
    }
    
    // Generic Claude detection (fallback)
    if (userAgent.includes('claude') || clientName.includes('claude')) {
      return {
        type: 'ai_agent',
        identity: 'claude',
        client: 'claude-generic',
        capabilities: ['structured_responses', 'batch_operations', 'auto_retry'],
        session_id: sessionId
      };
    }

    // Default for unknown clients
    return {
      type: 'unknown',
      identity: 'generic-client',
      client: clientName || 'unknown',
      capabilities: [],
      session_id: sessionId
    };
  }

  private logAgentDetection(): void {
    process.stderr.write(`[NEXLAYER-MCP] Agent detected: ${this.agentContext.identity} (${this.agentContext.client})\n`);
    process.stderr.write(`[NEXLAYER-MCP] Capabilities: ${this.agentContext.capabilities.join(', ')}\n`);
  }
}