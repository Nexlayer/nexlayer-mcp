/**
 * Deployment Session Tracing
 * Session-based workflow logging for AI agent visibility and debugging
 */

import { LogLevel, LogData } from './logger.js';

export interface DeploymentStep {
  tool: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'skipped';
  timestamp: string;
  duration?: number;
  message?: string;
  data?: LogData;
  error?: string;
}

export interface DeploymentTrace {
  sessionId: string;
  repoUrl?: string;
  applicationName?: string;
  startTime: string;
  endTime?: string;
  totalDuration?: number;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  steps: DeploymentStep[];
  metadata: {
    userId?: string;
    clientType?: string;
    mcpVersion?: string;
    nexlayerVersion?: string;
  };
}

export interface DeploymentSummary {
  sessionId: string;
  applicationName?: string;
  status: 'success' | 'failed' | 'in_progress';
  duration?: number;
  failedStep?: string;
  stepCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * In-memory deployment trace manager
 * For production, this could be backed by Redis or database
 */
export class DeploymentTraceManager {
  private traces = new Map<string, DeploymentTrace>();
  private readonly MAX_TRACES = 100; // Keep last 100 traces
  private readonly TRACE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Start a new deployment trace
   */
  startTrace(sessionId: string, repoUrl?: string, metadata: DeploymentTrace['metadata'] = {}): DeploymentTrace {
    const trace: DeploymentTrace = {
      sessionId,
      repoUrl,
      startTime: new Date().toISOString(),
      status: 'in_progress',
      steps: [],
      metadata
    };

    this.traces.set(sessionId, trace);
    this.cleanupOldTraces();
    
    return trace;
  }

  /**
   * Add a step to the deployment trace
   */
  addStep(sessionId: string, tool: string, status: DeploymentStep['status'], data: Partial<DeploymentStep> = {}): DeploymentStep {
    const trace = this.traces.get(sessionId);
    if (!trace) {
      throw new Error(`Deployment trace not found for session: ${sessionId}`);
    }

    const step: DeploymentStep = {
      tool,
      status,
      timestamp: new Date().toISOString(),
      ...data
    };

    trace.steps.push(step);

    // Update trace status based on step status
    if (status === 'failed') {
      trace.status = 'failed';
      trace.endTime = new Date().toISOString();
      trace.totalDuration = Date.now() - new Date(trace.startTime).getTime();
    }

    return step;
  }

  /**
   * Update an existing step (for duration tracking)
   */
  updateStep(sessionId: string, toolName: string, updates: Partial<DeploymentStep>): void {
    const trace = this.traces.get(sessionId);
    if (!trace) return;

    // Find the last step for this tool
    const stepIndex = trace.steps.findLastIndex((step: DeploymentStep) => step.tool === toolName);
    if (stepIndex >= 0) {
      const step = trace.steps[stepIndex];
      
      // Calculate duration if transitioning to final status
      if (updates.status && ['success', 'failed', 'skipped'].includes(updates.status) && !step.duration) {
        const startTime = new Date(step.timestamp).getTime();
        updates.duration = Date.now() - startTime;
      }

      trace.steps[stepIndex] = { ...step, ...updates };
    }
  }

  /**
   * Complete a deployment trace
   */
  completeTrace(sessionId: string, status: 'success' | 'failed', applicationName?: string): DeploymentTrace {
    const trace = this.traces.get(sessionId);
    if (!trace) {
      throw new Error(`Deployment trace not found for session: ${sessionId}`);
    }

    trace.status = status;
    trace.endTime = new Date().toISOString();
    trace.totalDuration = Date.now() - new Date(trace.startTime).getTime();
    
    if (applicationName) {
      trace.applicationName = applicationName;
    }

    return trace;
  }

  /**
   * Get deployment trace by session ID
   */
  getTrace(sessionId: string): DeploymentTrace | undefined {
    return this.traces.get(sessionId);
  }

  /**
   * Get deployment summary
   */
  getTraceSummary(sessionId: string): DeploymentSummary | undefined {
    const trace = this.traces.get(sessionId);
    if (!trace) return undefined;

    const successCount = trace.steps.filter(step => step.status === 'success').length;
    const failureCount = trace.steps.filter(step => step.status === 'failed').length;
    const failedStep = trace.steps.find(step => step.status === 'failed')?.tool;

    return {
      sessionId: trace.sessionId,
      applicationName: trace.applicationName,
      status: trace.status === 'in_progress' ? 'in_progress' : (failureCount > 0 ? 'failed' : 'success'),
      duration: trace.totalDuration,
      failedStep,
      stepCount: trace.steps.length,
      successCount,
      failureCount
    };
  }

  /**
   * Get all recent traces (for debugging/monitoring)
   */
  getRecentTraces(limit: number = 10): DeploymentTrace[] {
    const traces = Array.from(this.traces.values())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
    
    return traces;
  }

  /**
   * Get trace summaries for AI agent queries
   */
  getTraceSummaries(limit: number = 10): DeploymentSummary[] {
    return this.getRecentTraces(limit)
      .map(trace => this.getTraceSummary(trace.sessionId)!)
      .filter(Boolean);
  }

  /**
   * Clean up old traces to prevent memory leaks
   */
  private cleanupOldTraces(): void {
    if (this.traces.size <= this.MAX_TRACES) return;

    const now = Date.now();
    const tracesToDelete: string[] = [];

    for (const [sessionId, trace] of this.traces.entries()) {
      const traceAge = now - new Date(trace.startTime).getTime();
      if (traceAge > this.TRACE_TTL) {
        tracesToDelete.push(sessionId);
      }
    }

    // If still over limit after TTL cleanup, remove oldest traces
    if (this.traces.size - tracesToDelete.length > this.MAX_TRACES) {
      const sortedTraces = Array.from(this.traces.entries())
        .sort((a, b) => new Date(a[1].startTime).getTime() - new Date(b[1].startTime).getTime());
      
      const excessCount = this.traces.size - tracesToDelete.length - this.MAX_TRACES;
      for (let i = 0; i < excessCount; i++) {
        tracesToDelete.push(sortedTraces[i][0]);
      }
    }

    tracesToDelete.forEach(sessionId => this.traces.delete(sessionId));
  }

  /**
   * Generate a unique session ID
   */
  static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `nx_${timestamp}_${random}`;
  }
}

// Global trace manager instance
export const deploymentTracer = new DeploymentTraceManager();