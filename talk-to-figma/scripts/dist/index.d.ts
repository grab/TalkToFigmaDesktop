/**
 * Talk to Figma Skill
 *
 * AI-powered dynamic Figma control through code generation.
 *
 * This skill enables Claude Code to dynamically control Figma by:
 * 1. Analyzing user intent
 * 2. Generating Figma Plugin API code
 * 3. Executing code in an Empty Runtime Plugin
 * 4. Returning results
 */
import type { ExecutionResult } from './types.js';
export * from './types.js';
export { FigmaClient } from './figma-client.js';
/**
 * Main entry point for the Talk to Figma skill
 */
export declare class TalkToFigma {
    private client;
    constructor(serverUrl?: string);
    /**
     * Connect to Figma and join a channel
     */
    connect(channel: string): Promise<void>;
    /**
     * Disconnect from Figma
     */
    disconnect(): void;
    /**
     * Execute generated code in Figma
     */
    execute(code: string): Promise<ExecutionResult>;
    /**
     * Execute a pre-built command (for compatibility with existing MCP tools)
     */
    executeCommand(command: string, params?: Record<string, unknown>): Promise<unknown>;
    /**
     * Wrap code in async IIFE pattern for safe execution
     */
    private wrapCode;
    /**
     * Check if connected
     */
    isConnected(): boolean;
}
export default TalkToFigma;
//# sourceMappingURL=index.d.ts.map