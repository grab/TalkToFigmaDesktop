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
import { FigmaClient } from './figma-client.js';
// Re-export types
export * from './types.js';
export { FigmaClient } from './figma-client.js';
/**
 * Main entry point for the Talk to Figma skill
 */
export class TalkToFigma {
    client;
    constructor(serverUrl) {
        this.client = new FigmaClient(serverUrl);
    }
    /**
     * Connect to Figma and join a channel
     */
    async connect(channel) {
        await this.client.connect();
        await this.client.joinChannel(channel);
        console.log(`[TalkToFigma] Connected to channel: ${channel}`);
    }
    /**
     * Disconnect from Figma
     */
    disconnect() {
        this.client.disconnect();
        console.log('[TalkToFigma] Disconnected');
    }
    /**
     * Execute generated code in Figma
     */
    async execute(code) {
        if (!this.client.isConnected()) {
            return {
                success: false,
                error: 'Not connected to Figma',
            };
        }
        // Wrap code in async IIFE if not already wrapped
        const wrappedCode = this.wrapCode(code);
        return await this.client.executeCode(wrappedCode);
    }
    /**
     * Execute a pre-built command (for compatibility with existing MCP tools)
     */
    async executeCommand(command, params = {}) {
        return await this.client.sendCommand(command, params);
    }
    /**
     * Wrap code in async IIFE pattern for safe execution
     */
    wrapCode(code) {
        // Check if code is already wrapped
        if (code.trim().startsWith('(async') || code.trim().startsWith('async')) {
            return code;
        }
        // Wrap in async IIFE with error handling
        return `
(async () => {
  try {
${code.split('\n').map(line => '    ' + line).join('\n')}
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
})();
`.trim();
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.client.isConnected();
    }
}
// CLI support
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
    const args = process.argv.slice(2);
    const channelArg = args.find((arg) => arg.startsWith('--channel='));
    const channel = channelArg?.split('=')[1];
    if (!channel) {
        console.log('Usage: npx ts-node src/index.ts --channel=<channel-name>');
        console.log('');
        console.log('Example:');
        console.log('  npx ts-node src/index.ts --channel=my-figma-channel');
        process.exit(1);
    }
    const skill = new TalkToFigma();
    skill.connect(channel)
        .then(() => {
        console.log('Ready to execute commands.');
        console.log('Press Ctrl+C to exit.');
        // Keep process alive
        process.stdin.resume();
        process.on('SIGINT', () => {
            console.log('\nDisconnecting...');
            skill.disconnect();
            process.exit(0);
        });
    })
        .catch((error) => {
        console.error('Failed to connect:', error);
        process.exit(1);
    });
}
export default TalkToFigma;
//# sourceMappingURL=index.js.map