# Figma Plugin API Reference

This document provides reference patterns for generating Figma Plugin API code. All examples are extracted from working implementations.

## Table of Contents

- [Node Operations](#node-operations)
- [Color & Style Operations](#color--style-operations)
- [Layout Operations](#layout-operations)
- [Text Operations](#text-operations)
- [Selection Operations](#selection-operations)
- [Component Operations](#component-operations)
- [Common Patterns](#common-patterns)

---

## Node Operations

### Get Document Info

```typescript
const page = figma.currentPage;
return {
  name: page.name,
  id: page.id,
  type: page.type,
  children: page.children.map(child => ({
    id: child.id,
    name: child.name,
    type: child.type
  })),
  currentPage: {
    id: page.id,
    name: page.name,
    childCount: page.children.length
  }
};
```

### Get Node By ID

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node) {
  return { success: false, error: 'Node not found' };
}
return {
  id: node.id,
  name: node.name,
  type: node.type,
  // ... other properties
};
```

### Create Rectangle

```typescript
const rect = figma.createRectangle();
rect.x = x;
rect.y = y;
rect.resize(width, height);
rect.name = name || 'Rectangle';

// Set fill color (optional)
if (r !== undefined && g !== undefined && b !== undefined) {
  rect.fills = [{
    type: 'SOLID',
    color: { r, g, b },
    opacity: a ?? 1
  }];
}

// Append to parent (optional)
if (parentId) {
  const parent = await figma.getNodeByIdAsync(parentId);
  if (parent && 'appendChild' in parent) {
    parent.appendChild(rect);
  }
} else {
  figma.currentPage.appendChild(rect);
}

return { id: rect.id, name: rect.name, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
```

### Create Frame

```typescript
const frame = figma.createFrame();
frame.x = x;
frame.y = y;
frame.resize(width, height);
frame.name = name || 'Frame';

// Set background color (optional)
if (r !== undefined && g !== undefined && b !== undefined) {
  frame.fills = [{
    type: 'SOLID',
    color: { r, g, b }
  }];
}

// Set auto-layout (optional)
if (layoutMode && layoutMode !== 'NONE') {
  frame.layoutMode = layoutMode; // 'HORIZONTAL' | 'VERTICAL'
  frame.primaryAxisAlignItems = 'MIN';
  frame.counterAxisAlignItems = counterAxisAlignItems || 'MIN';
  frame.itemSpacing = 10;
}

// Append to parent (optional)
if (parentId) {
  const parent = await figma.getNodeByIdAsync(parentId);
  if (parent && 'appendChild' in parent) {
    parent.appendChild(frame);
  }
}

return { id: frame.id, name: frame.name };
```

### Create Text

```typescript
const text = figma.createText();

// IMPORTANT: Must load font before setting characters
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

text.x = x;
text.y = y;
text.characters = textContent;
text.fontSize = fontSize || 14;

// Set font weight (optional)
if (fontWeight) {
  const style = fontWeight >= 700 ? 'Bold' : fontWeight >= 500 ? 'Medium' : 'Regular';
  await figma.loadFontAsync({ family: 'Inter', style });
  text.fontName = { family: 'Inter', style };
}

// Set color (optional)
if (r !== undefined && g !== undefined && b !== undefined) {
  text.fills = [{
    type: 'SOLID',
    color: { r, g, b },
    opacity: a ?? 1
  }];
}

// Append to parent (optional)
if (parentId) {
  const parent = await figma.getNodeByIdAsync(parentId);
  if (parent && 'appendChild' in parent) {
    parent.appendChild(text);
  }
}

return { id: text.id, characters: text.characters };
```

### Move Node

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node) {
  return { success: false, error: 'Node not found' };
}
if ('x' in node && 'y' in node) {
  node.x = x;
  node.y = y;
  return { success: true, id: node.id, x: node.x, y: node.y };
}
return { success: false, error: 'Node cannot be moved' };
```

### Resize Node

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node) {
  return { success: false, error: 'Node not found' };
}
if ('resize' in node) {
  node.resize(width, height);
  return { success: true, id: node.id, width, height };
}
return { success: false, error: 'Node cannot be resized' };
```

### Clone Node

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node) {
  return { success: false, error: 'Node not found' };
}
const clone = node.clone();
if (x !== undefined) clone.x = x;
if (y !== undefined) clone.y = y;
return { success: true, id: clone.id, name: clone.name };
```

### Delete Node

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node) {
  return { success: false, error: 'Node not found' };
}
node.remove();
return { success: true };
```

---

## Color & Style Operations

### Set Fill Color

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node || !('fills' in node)) {
  return { success: false, error: 'Node not found or cannot have fills' };
}

node.fills = [{
  type: 'SOLID',
  color: { r, g, b },
  opacity: a ?? 1
}];

return { success: true, id: node.id, fills: node.fills };
```

### Set Stroke Color

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node || !('strokes' in node)) {
  return { success: false, error: 'Node not found or cannot have strokes' };
}

node.strokes = [{
  type: 'SOLID',
  color: { r, g, b },
  opacity: a ?? 1
}];

if (weight !== undefined && 'strokeWeight' in node) {
  node.strokeWeight = weight;
}

return { success: true, id: node.id, strokes: node.strokes };
```

### Set Corner Radius

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node || !('cornerRadius' in node)) {
  return { success: false, error: 'Node cannot have corner radius' };
}

// Uniform radius
node.cornerRadius = radius;

// Or individual corners (if corners array provided)
if (corners) {
  node.topLeftRadius = corners[0] ? radius : 0;
  node.topRightRadius = corners[1] ? radius : 0;
  node.bottomRightRadius = corners[2] ? radius : 0;
  node.bottomLeftRadius = corners[3] ? radius : 0;
}

return { success: true, id: node.id, cornerRadius: radius };
```

---

## Layout Operations

### Set Layout Mode (Auto-layout)

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node || node.type !== 'FRAME') {
  return { success: false, error: 'Node is not a frame' };
}

node.layoutMode = layoutMode; // 'NONE' | 'HORIZONTAL' | 'VERTICAL'

if (layoutWrap) {
  node.layoutWrap = layoutWrap; // 'NO_WRAP' | 'WRAP'
}

return { success: true, id: node.id, layoutMode: node.layoutMode };
```

### Set Padding

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node || node.type !== 'FRAME' || node.layoutMode === 'NONE') {
  return { success: false, error: 'Node is not an auto-layout frame' };
}

if (paddingTop !== undefined) node.paddingTop = paddingTop;
if (paddingRight !== undefined) node.paddingRight = paddingRight;
if (paddingBottom !== undefined) node.paddingBottom = paddingBottom;
if (paddingLeft !== undefined) node.paddingLeft = paddingLeft;

return { success: true, id: node.id };
```

### Set Axis Alignment

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node || node.type !== 'FRAME' || node.layoutMode === 'NONE') {
  return { success: false, error: 'Node is not an auto-layout frame' };
}

// Primary axis: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN'
if (primaryAxisAlignItems) {
  node.primaryAxisAlignItems = primaryAxisAlignItems;
}

// Counter axis: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE'
if (counterAxisAlignItems) {
  node.counterAxisAlignItems = counterAxisAlignItems;
}

return { success: true, id: node.id };
```

### Set Item Spacing

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node || node.type !== 'FRAME' || node.layoutMode === 'NONE') {
  return { success: false, error: 'Node is not an auto-layout frame' };
}

if (itemSpacing !== undefined) {
  node.itemSpacing = itemSpacing;
}

// Counter axis spacing (for wrapped layouts)
if (counterAxisSpacing !== undefined && node.layoutWrap === 'WRAP') {
  node.counterAxisSpacing = counterAxisSpacing;
}

return { success: true, id: node.id };
```

### Set Layout Sizing

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node || !('layoutSizingHorizontal' in node)) {
  return { success: false, error: 'Node does not support layout sizing' };
}

// 'FIXED' | 'HUG' | 'FILL'
if (layoutSizingHorizontal) {
  node.layoutSizingHorizontal = layoutSizingHorizontal;
}
if (layoutSizingVertical) {
  node.layoutSizingVertical = layoutSizingVertical;
}

return { success: true, id: node.id };
```

---

## Text Operations

### Set Text Content

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node || node.type !== 'TEXT') {
  return { success: false, error: 'Node is not a text node' };
}

// IMPORTANT: Must load font before changing text
await figma.loadFontAsync(node.fontName as FontName);
node.characters = text;

return { success: true, id: node.id, characters: node.characters };
```

### Set Multiple Text Contents (Batch)

```typescript
const results = [];
for (const item of textItems) {
  const node = await figma.getNodeByIdAsync(item.nodeId);
  if (node && node.type === 'TEXT') {
    await figma.loadFontAsync(node.fontName as FontName);
    const original = node.characters;
    node.characters = item.text;
    results.push({
      success: true,
      nodeId: item.nodeId,
      originalText: original,
      newText: item.text
    });
  } else {
    results.push({
      success: false,
      nodeId: item.nodeId,
      error: 'Node not found or not a text node'
    });
  }
}
return { success: true, results };
```

### Scan Text Nodes

```typescript
const parentNode = await figma.getNodeByIdAsync(nodeId);
if (!parentNode) {
  return { success: false, error: 'Node not found' };
}

const textNodes = [];
function findTextNodes(node) {
  if (node.type === 'TEXT') {
    textNodes.push({
      id: node.id,
      name: node.name,
      characters: node.characters,
      fontSize: node.fontSize,
      fontName: node.fontName
    });
  }
  if ('children' in node) {
    for (const child of node.children) {
      findTextNodes(child);
    }
  }
}

findTextNodes(parentNode);
return { success: true, textNodes, totalNodes: textNodes.length };
```

---

## Selection Operations

### Get Selection

```typescript
const selection = figma.currentPage.selection;
return {
  selectionCount: selection.length,
  selection: selection.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible
  }))
};
```

### Set Selection

```typescript
const nodes = [];
for (const nodeId of nodeIds) {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (node) {
    nodes.push(node);
  }
}

figma.currentPage.selection = nodes;

// Optionally scroll to selection
if (nodes.length > 0) {
  figma.viewport.scrollAndZoomIntoView(nodes);
}

return {
  success: true,
  count: nodes.length,
  selectedNodes: nodes.map(n => ({ name: n.name, id: n.id }))
};
```

### Set Focus (Select and Zoom)

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node) {
  return { success: false, error: 'Node not found' };
}

figma.currentPage.selection = [node];
figma.viewport.scrollAndZoomIntoView([node]);

return { success: true, id: node.id, name: node.name };
```

---

## Component Operations

### Get Local Components

```typescript
const components = figma.root.findAll(node => node.type === 'COMPONENT');
return {
  components: components.map(comp => ({
    id: comp.id,
    name: comp.name,
    key: comp.key,
    description: comp.description
  }))
};
```

### Create Component Instance

```typescript
const component = await figma.importComponentByKeyAsync(componentKey);
if (!component) {
  return { success: false, error: 'Component not found' };
}

const instance = component.createInstance();
instance.x = x;
instance.y = y;

return { success: true, id: instance.id, name: instance.name };
```

### Get Instance Overrides

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node || node.type !== 'INSTANCE') {
  return { success: false, error: 'Node is not an instance' };
}

return {
  success: true,
  sourceInstanceId: node.id,
  mainComponentId: node.mainComponent?.id,
  overridesCount: node.overrides?.length || 0
};
```

---

## Common Patterns

### Error Handling Pattern

```typescript
(async () => {
  try {
    // Your code here
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
})();
```

### Node Type Checking

```typescript
// Check if node supports fills
if ('fills' in node) {
  node.fills = [/* ... */];
}

// Check if node is a frame
if (node.type === 'FRAME') {
  node.layoutMode = 'VERTICAL';
}

// Check if node can have children
if ('children' in node) {
  for (const child of node.children) {
    // process children
  }
}
```

### Batch Operations with Progress

```typescript
const nodes = figma.currentPage.selection;
const results = [];
const total = nodes.length;

for (let i = 0; i < nodes.length; i++) {
  const node = nodes[i];
  // Process node...
  results.push({ id: node.id, success: true });

  // Report progress (optional)
  figma.ui.postMessage({
    type: 'progress',
    current: i + 1,
    total: total
  });
}

return { success: true, processed: results.length, results };
```

### Finding Nodes by Criteria

```typescript
// Find all frames with specific name
const frames = figma.currentPage.findAll(node =>
  node.type === 'FRAME' && node.name.includes('Card')
);

// Find all nodes with specific fill color
const redNodes = figma.currentPage.findAll(node => {
  if (!('fills' in node)) return false;
  const fills = node.fills as Paint[];
  return fills.some(fill =>
    fill.type === 'SOLID' && fill.color.r > 0.9 && fill.color.g < 0.1 && fill.color.b < 0.1
  );
});

// Find children by type
const textChildren = parentNode.findAll(node => node.type === 'TEXT');
```

---

## Important Notes

1. **Font Loading**: Always load fonts before modifying text content
2. **Async Operations**: Use `await` for `getNodeByIdAsync` and other async methods
3. **Type Checking**: Always verify node type before accessing type-specific properties
4. **Error Handling**: Wrap operations in try-catch and return structured results
5. **Node Existence**: Always check if node exists before operating on it
