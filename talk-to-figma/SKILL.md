---
name: talk-to-figma
description: AI-powered dynamic Figma control through code generation. Generate and execute Figma Plugin API code dynamically to manipulate designs.
license: Apache-2.0
metadata:
  author: design-team
  version: "0.1.0"
---

# Talk to Figma Skill

This skill enables Claude Code to dynamically control Figma through code generation. Instead of using pre-defined MCP tools, it generates Figma Plugin API code on-the-fly and executes it in an Empty Runtime Plugin.

## Architecture Overview

```
User Request → AI Intent Analysis → Code Generation → CDP/WebSocket → Empty Plugin → Figma
```

### Key Innovation

- **Dynamic Code Generation**: No pre-defined tools, AI generates code as needed
- **Empty Runtime Plugin**: ~45 lines, executes any generated code
- **Full API Coverage**: Access to entire Figma Plugin API
- **Parallel Execution**: Multiple Figma sessions can run simultaneously

## When to Use This Skill

Use this skill when:
- Manipulating Figma designs programmatically
- Creating, modifying, or querying Figma nodes
- Batch operations on design files
- Automating repetitive design tasks

## Getting Started

### Prerequisites

1. Figma Desktop or Browser with Developer Mode enabled
2. Empty Runtime Plugin installed in Figma
3. WebSocket connection established (or CDP for advanced usage)

### Basic Usage

1. Connect to Figma via WebSocket or CDP
2. Generate Figma Plugin API code based on user intent
3. Execute the code in the Empty Runtime Plugin
4. Return results to user

## Code Generation Guidelines

When generating Figma Plugin API code:

1. **Always check node existence** before operations
2. **Use async/await** for API calls that return Promises
3. **Return structured results** with success/error status
4. **Handle edge cases** (empty selection, missing properties, etc.)

### Code Template

```typescript
// Generated code should follow this pattern
(async () => {
  try {
    // Your Figma Plugin API code here
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      return { success: false, error: 'No selection' };
    }

    // Perform operations...

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
})();
```

## Available Operations

### Node Operations
- Create nodes (Frame, Rectangle, Text, etc.)
- Modify node properties (position, size, fills, strokes)
- Delete nodes
- Clone nodes
- Reparent nodes

### Style Operations
- Set fill colors
- Set stroke colors
- Apply effects (shadows, blur)
- Set corner radius

### Layout Operations
- Set auto-layout properties
- Set padding and spacing
- Set alignment

### Text Operations
- Set text content
- Set font properties
- Scan text nodes

### Selection Operations
- Get current selection
- Set selection
- Find nodes by criteria

## Reference Documentation

See [REFERENCE.md](references/REFERENCE.md) for detailed Figma Plugin API examples extracted from working implementations.

## Error Handling

If code execution fails:

1. Parse the error message
2. Identify the issue (missing property, type error, etc.)
3. Generate corrected code
4. Retry execution (max 3 attempts)

## Examples

### Example 1: Create a Rectangle

```typescript
const rect = figma.createRectangle();
rect.x = 100;
rect.y = 100;
rect.resize(200, 150);
rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
figma.currentPage.appendChild(rect);
return { success: true, data: { id: rect.id, name: rect.name } };
```

### Example 2: Change Selection Color

```typescript
const selection = figma.currentPage.selection;
for (const node of selection) {
  if ('fills' in node) {
    node.fills = [{ type: 'SOLID', color: { r: 0, g: 0.5, b: 1 } }];
  }
}
return { success: true, data: { modified: selection.length } };
```

### Example 3: Find and Replace Text

```typescript
const textNodes = figma.currentPage.findAll(n => n.type === 'TEXT');
let replaced = 0;
for (const node of textNodes) {
  if (node.characters.includes('OLD_TEXT')) {
    await figma.loadFontAsync(node.fontName);
    node.characters = node.characters.replace(/OLD_TEXT/g, 'NEW_TEXT');
    replaced++;
  }
}
return { success: true, data: { replaced } };
```

## Troubleshooting

### Connection Issues
1. Verify WebSocket server is running on port 3055
2. Check Figma plugin is open and connected
3. Verify channel name matches

### Code Execution Errors
1. Check for syntax errors in generated code
2. Verify node types support the operation
3. Ensure fonts are loaded before text manipulation

## Related Resources

- [Figma Plugin API Documentation](https://www.figma.com/plugin-docs/)
- [Reference Documentation](references/REFERENCE.md)
