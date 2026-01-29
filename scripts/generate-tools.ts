#!/usr/bin/env tsx
/**
 * Generate tools.ts from cursor-talk-to-figma-mcp server.ts
 *
 * This script parses the original MCP server implementation and generates
 * TypeScript tool definitions with proper inputSchemas.
 *
 * Usage: npm run generate:tools
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_URL = 'https://raw.githubusercontent.com/grab/cursor-talk-to-figma-mcp/refs/heads/main/src/talk_to_figma_mcp/server.ts';
const OUTPUT_FILE = path.join(__dirname, '../src/main/server/tools.ts');

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Parse Zod schema to TypeScript inputSchema
 */
function parseZodSchema(schemaText: string): { properties: Record<string, any>; required: string[] } {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  // Split schema by lines and parse property by property
  const lines = schemaText.split('\n').map(line => line.trim()).filter(line => line);

  let currentProp: string | null = null;
  let currentDef: string[] = [];
  let collectingDef = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match property name: "propName:" (with or without z. on same line)
    const propMatch = line.match(/^(\w+):\s*(z\.)?/);

    if (propMatch && !collectingDef) {
      // Save previous property if exists
      if (currentProp && currentDef.length > 0) {
        const zodDef = currentDef.join(' ');
        parseProperty(currentProp, zodDef, properties, required);
      }

      // Start new property
      currentProp = propMatch[1];
      currentDef = [];
      collectingDef = true;

      // Check if z. is on the same line
      if (propMatch[2]) {
        currentDef.push(line.substring(line.indexOf('z.')));
      }
    } else if (collectingDef) {
      // Check if this line starts a new property (has : in it and matches property pattern)
      const nextPropMatch = line.match(/^\w+:\s*/);
      if (nextPropMatch && !line.includes('//')) {
        // This is a new property, save current one first
        if (currentProp && currentDef.length > 0) {
          const zodDef = currentDef.join(' ');
          parseProperty(currentProp, zodDef, properties, required);
        }
        // Reset and process this line as new property
        currentProp = line.substring(0, line.indexOf(':')).trim();
        currentDef = [];
        collectingDef = true;

        const zIndex = line.indexOf('z.');
        if (zIndex !== -1) {
          currentDef.push(line.substring(zIndex));
        }
      } else if (line.startsWith('z.') || currentDef.length > 0) {
        // Continue collecting current property definition
        if (!line.startsWith('}') && !line.startsWith('//')) {
          currentDef.push(line);
        }
      }
    }
  }

  // Parse last property
  if (currentProp && currentDef.length > 0) {
    const zodDef = currentDef.join(' ');
    parseProperty(currentProp, zodDef, properties, required);
  }

  return { properties, required };
}

/**
 * Parse individual property definition
 */
function parseProperty(
  propName: string,
  zodDef: string,
  properties: Record<string, any>,
  required: string[]
): void {
  const property: any = {};

  // Normalize whitespace for easier parsing
  const normalized = zodDef.replace(/\s+/g, ' ').trim();

  // Remove trailing comma
  const cleaned = normalized.replace(/,\s*$/, '');

  // Check if optional
  const isOptional = cleaned.includes('.optional()');
  if (!isOptional) {
    required.push(propName);
  }

  // Extract description (handle multiline descriptions)
  const descMatch = cleaned.match(/\.describe\(["']([^"']+)["']\)/);
  if (descMatch) {
    property.description = descMatch[1];
  }

  // Determine type
  if (cleaned.match(/^z\.\s*string\(\)/)) {
    property.type = 'string';
  } else if (cleaned.match(/^z\.\s*number\(\)/)) {
    property.type = 'number';
  } else if (cleaned.match(/^z\.\s*boolean\(\)/)) {
    property.type = 'boolean';
  } else if (cleaned.match(/^z\.\s*enum\(/)) {
    property.type = 'string';
    // Extract enum values - handle multiline enum arrays
    const enumMatch = cleaned.match(/\.enum\(\[([^\]]+)\]\)/);
    if (enumMatch) {
      const enumStr = enumMatch[1];
      const enumValues = enumStr
        .split(',')
        .map(v => v.trim().replace(/['"]/g, ''))
        .filter(v => v);
      property.enum = enumValues;
    }
  } else if (cleaned.match(/^z\.\s*array\(\)/)) {
    property.type = 'array';
    property.items = { type: 'string' };

    // Check if it's object array
    if (cleaned.includes('z.object(')) {
      property.items = { type: 'object' };
    }
  }

  // Handle number constraints
  if (property.type === 'number') {
    const minMatch = cleaned.match(/\.min\((\d+)\)/);
    const maxMatch = cleaned.match(/\.max\((\d+)\)/);
    if (minMatch) property.minimum = Number(minMatch[1]);
    if (maxMatch) property.maximum = Number(maxMatch[1]);
  }

  properties[propName] = property;
}

/**
 * Extract tool definitions from server.ts
 */
function extractToolDefinitions(sourceCode: string): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  // Find all server.tool( occurrences and parse each one
  const toolStartRegex = /server\.tool\s*\(/g;

  let match: RegExpExecArray | null;
  while ((match = toolStartRegex.exec(sourceCode)) !== null) {
    const startPos = match.index;

    try {
      // Find the matching closing parenthesis for this server.tool() call
      const result = extractToolFromPosition(sourceCode, startPos);
      if (result) {
        tools.push(result);
        console.log(`\nParsing tool: ${result.name}`);
      }
    } catch (error) {
      console.warn(`Failed to parse tool at position ${startPos}:`, error);
    }
  }

  console.log(`Found ${tools.length} tool definitions`);
  return tools;
}

/**
 * Extract a single tool definition starting from a position
 */
function extractToolFromPosition(sourceCode: string, startPos: number): ToolDefinition | null {
  // Skip "server.tool("
  let pos = sourceCode.indexOf('(', startPos) + 1;

  // Extract tool name (first string argument)
  const nameMatch = sourceCode.substring(pos).match(/^\s*["'](\w+)["']/);
  if (!nameMatch) return null;
  const name = nameMatch[1];
  pos += nameMatch[0].length;

  // Skip comma
  pos = sourceCode.indexOf(',', pos) + 1;

  // Extract description (second string argument, may be multiline)
  const descStart = sourceCode.substring(pos).search(/["'`]/);
  if (descStart === -1) return null;
  pos += descStart;

  const quoteChar = sourceCode[pos];
  pos++; // Skip opening quote

  let description = '';
  let escaped = false;
  while (pos < sourceCode.length) {
    const char = sourceCode[pos];
    if (escaped) {
      description += char;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === quoteChar) {
      pos++; // Skip closing quote
      break;
    } else {
      description += char;
    }
    pos++;
  }

  // Skip comma
  pos = sourceCode.indexOf(',', pos) + 1;

  // Extract schema object (third argument)
  const schemaStart = sourceCode.substring(pos).search(/\{/);
  if (schemaStart === -1) return null;
  pos += schemaStart;

  // Find matching closing brace
  let braceCount = 0;
  const schemaStartPos = pos;
  while (pos < sourceCode.length) {
    const char = sourceCode[pos];
    if (char === '{') braceCount++;
    else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        const schemaText = sourceCode.substring(schemaStartPos + 1, pos);
        const { properties, required } = parseZodSchema(schemaText);

        return {
          name,
          description: description.trim(),
          inputSchema: {
            type: 'object',
            properties,
            required,
          },
        };
      }
    }
    pos++;
  }

  return null;
}

/**
 * Additional tools from Kotlin app (not in original MCP server)
 */
const ADDITIONAL_TOOLS: ToolDefinition[] = [
  {
    name: 'figma_get_comments',
    description: 'Get all comments from a Figma file using REST API. Requires OAuth authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        fileKey: {
          type: 'string',
          description: 'Figma file key (optional if set in config)',
        },
      },
      required: [],
    },
  },
  {
    name: 'figma_post_reply',
    description: 'Post a reply to a comment using Figma REST API. Requires OAuth authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        commentId: {
          type: 'string',
          description: 'ID of the comment to reply to',
        },
        message: {
          type: 'string',
          description: 'Reply message text',
        },
      },
      required: ['commentId', 'message'],
    },
  },
  {
    name: 'figma_post_reaction',
    description: 'Post an emoji reaction to a comment using Figma REST API. Requires OAuth authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        commentId: {
          type: 'string',
          description: 'ID of the comment to react to',
        },
        emoji: {
          type: 'string',
          description: 'Emoji character to react with',
        },
      },
      required: ['commentId', 'emoji'],
    },
  },
  {
    name: 'figma_get_reactions',
    description: 'Get all reactions for a comment using Figma REST API. Requires OAuth authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        commentId: {
          type: 'string',
          description: 'ID of the comment to get reactions for',
        },
      },
      required: ['commentId'],
    },
  },
  {
    name: 'figma_delete_reaction',
    description: 'Delete a reaction from a comment using Figma REST API. Requires OAuth authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        commentId: {
          type: 'string',
          description: 'ID of the comment',
        },
        emoji: {
          type: 'string',
          description: 'Emoji character to remove',
        },
      },
      required: ['commentId', 'emoji'],
    },
  },
  {
    name: 'figma_get_config',
    description: 'Get OAuth configuration status (access token, file key, user info)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'figma_set_config',
    description: 'Set OAuth configuration (access token, file key, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'Figma OAuth access token',
        },
        refreshToken: {
          type: 'string',
          description: 'Figma OAuth refresh token',
        },
        fileKey: {
          type: 'string',
          description: 'Default Figma file key',
        },
      },
      required: [],
    },
  },
  {
    name: 'send_notification',
    description: 'Send a desktop notification to the user',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Notification title',
        },
        body: {
          type: 'string',
          description: 'Notification body text',
        },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'get_active_channels',
    description: 'Get list of active WebSocket channels for debugging connection issues',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'connection_diagnostics',
    description: 'Run diagnostics on WebSocket connection and report status',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

/**
 * Generate tools.ts file
 */
function generateToolsFile(tools: ToolDefinition[]): string {
  const header = `/**
 * Figma MCP Tools Definitions
 * Total ${tools.length} tools (${tools.length - ADDITIONAL_TOOLS.length} from original + ${ADDITIONAL_TOOLS.length} additional)
 *
 * Auto-generated from: ${SOURCE_URL}
 * Generated at: ${new Date().toISOString()}
 *
 * To regenerate: npm run generate:tools
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const allTools: ToolDefinition[] = [`;

  const toolsJson = tools.map(tool => {
    return `  ${JSON.stringify(tool, null, 2).replace(/\n/g, '\n  ')}`;
  }).join(',\n');

  const footer = `\n];\n`;

  return header + toolsJson + footer;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Generating tools.ts from cursor-talk-to-figma-mcp...\n');

  // Fetch source file from GitHub
  console.log(`📡 Fetching from: ${SOURCE_URL}`);

  try {
    const response = await fetch(SOURCE_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const sourceCode = await response.text();
    console.log(`✅ Fetched source file (${sourceCode.length} bytes)`);

    // Extract tool definitions
    const tools = extractToolDefinitions(sourceCode);
    console.log(`\n✅ Extracted ${tools.length} tools from original MCP server`);

    // Add additional tools
    const allTools = [...tools, ...ADDITIONAL_TOOLS];
    console.log(`✅ Added ${ADDITIONAL_TOOLS.length} additional tools`);
    console.log(`\n📊 Total tools: ${allTools.length}`);

    // Generate output file
    const outputContent = generateToolsFile(allTools);
    fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf-8');
    console.log(`\n✅ Generated: ${OUTPUT_FILE}`);

    // Summary
    console.log('\n📋 Tool Summary:');
    console.log(`   Original MCP tools: ${tools.length}`);
    console.log(`   Additional tools: ${ADDITIONAL_TOOLS.length}`);
    console.log(`   Total: ${allTools.length}`);

    console.log('\n✨ Done!');
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
