/**
 * Talk to Figma Skill - Figma Client
 *
 * WebSocket client for communicating with the Figma plugin.
 */
import type { ExecutionResult, ExecuteOptions } from './types.js';
/**
 * Client for communicating with Figma plugin via WebSocket
 */
export declare class FigmaClient {
    private ws;
    private currentChannel;
    private pendingRequests;
    private serverUrl;
    constructor(serverUrl?: string);
    /**
     * Connect to WebSocket server
     */
    connect(): Promise<void>;
    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void;
    /**
     * Join a channel
     */
    joinChannel(channel: string): Promise<void>;
    /**
     * Execute code in Figma plugin
     */
    executeCode(code: string, options?: ExecuteOptions): Promise<ExecutionResult>;
    /**
     * Send a command to Figma plugin
     */
    sendCommand(command: string, params?: Record<string, unknown>, timeout?: number): Promise<unknown>;
    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage;
    /**
     * Check if connected to a channel
     */
    isConnected(): boolean;
    /**
     * Get current channel
     */
    getChannel(): string | null;
    /**
     * Delay helper
     */
    private delay;
}
export default FigmaClient;
//# sourceMappingURL=figma-client.d.ts.map