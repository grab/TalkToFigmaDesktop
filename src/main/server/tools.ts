/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Figma MCP Tools Definitions
 * Total 50 tools (40 from original + 10 additional)
 *
 * Auto-generated from: https://raw.githubusercontent.com/grab/cursor-talk-to-figma-mcp/refs/heads/main/src/talk_to_figma_mcp/server.ts
 * Generated at: 2026-01-20T17:15:57.879Z
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

export const allTools: ToolDefinition[] = [  {
    "name": "get_document_info",
    "description": "Get detailed information about the current Figma document",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "get_selection",
    "description": "Get information about the current selection in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "read_my_design",
    "description": "Get detailed information about the current selection in Figma, including all node details",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "get_node_info",
    "description": "Get detailed information about a specific node in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node to get information about",
          "type": "string"
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "get_nodes_info",
    "description": "Get detailed information about multiple nodes in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeIds": {
          "description": "Array of node IDs to get information about",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "nodeIds"
      ]
    }
  },
  {
    "name": "create_rectangle",
    "description": "Create a new rectangle in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "x": {
          "description": "X position",
          "type": "number"
        },
        "y": {
          "description": "Y position",
          "type": "number"
        },
        "width": {
          "description": "Width of the rectangle",
          "type": "number"
        },
        "height": {
          "description": "Height of the rectangle",
          "type": "number"
        },
        "name": {
          "description": "Optional name for the rectangle",
          "type": "string"
        },
        "parentId": {
          "description": "Optional parent node ID to append the rectangle to",
          "type": "string"
        }
      },
      "required": [
        "x",
        "y",
        "width",
        "height"
      ]
    }
  },
  {
    "name": "create_frame",
    "description": "Create a new frame in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "x": {
          "description": "X position",
          "type": "number"
        },
        "y": {
          "description": "Y position",
          "type": "number"
        },
        "width": {
          "description": "Width of the frame",
          "type": "number"
        },
        "height": {
          "description": "Height of the frame",
          "type": "number"
        },
        "name": {
          "description": "Optional name for the frame",
          "type": "string"
        },
        "parentId": {
          "description": "Optional parent node ID to append the frame to",
          "type": "string"
        },
        "r": {
          "description": "Red component (0-1)",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "g": {
          "description": "Green component (0-1)",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "b": {
          "description": "Blue component (0-1)",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "strokeWeight": {
          "description": "Stroke weight",
          "type": "number"
        },
        "layoutMode": {
          "description": "Auto-layout mode for the frame",
          "type": "string",
          "enum": [
            "NONE",
            "HORIZONTAL",
            "VERTICAL"
          ]
        },
        "layoutWrap": {
          "description": "Whether the auto-layout frame wraps its children",
          "type": "string",
          "enum": [
            "NO_WRAP",
            "WRAP"
          ]
        },
        "paddingTop": {
          "description": "Top padding for auto-layout frame",
          "type": "number"
        },
        "paddingRight": {
          "description": "Right padding for auto-layout frame",
          "type": "number"
        },
        "paddingBottom": {
          "description": "Bottom padding for auto-layout frame",
          "type": "number"
        },
        "paddingLeft": {
          "description": "Left padding for auto-layout frame",
          "type": "number"
        },
        "counterAxisAlignItems": {
          "description": "Counter axis alignment for auto-layout frame",
          "type": "string",
          "enum": [
            "MIN",
            "MAX",
            "CENTER",
            "BASELINE"
          ]
        },
        "layoutSizingHorizontal": {
          "description": "Horizontal sizing mode for auto-layout frame",
          "type": "string",
          "enum": [
            "FIXED",
            "HUG",
            "FILL"
          ]
        },
        "layoutSizingVertical": {
          "description": "Vertical sizing mode for auto-layout frame",
          "type": "string",
          "enum": [
            "FIXED",
            "HUG",
            "FILL"
          ]
        }
      },
      "required": [
        "x",
        "y",
        "width",
        "height"
      ]
    }
  },
  {
    "name": "create_text",
    "description": "Create a new text element in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "x": {
          "description": "X position",
          "type": "number"
        },
        "y": {
          "description": "Y position",
          "type": "number"
        },
        "text": {
          "description": "Text content",
          "type": "string"
        },
        "fontSize": {
          "description": "Font size (default: 14)",
          "type": "number"
        },
        "fontWeight": {
          "description": "Font weight (e.g., 400 for Regular, 700 for Bold)",
          "type": "number"
        },
        "r": {
          "description": "Red component (0-1) for font color",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "g": {
          "description": "Green component (0-1) for font color",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "b": {
          "description": "Blue component (0-1) for font color",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "a": {
          "description": "Alpha component (0-1) for font color",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "name": {
          "description": "Semantic layer name for the text node",
          "type": "string"
        },
        "parentId": {
          "description": "Optional parent node ID to append the text to",
          "type": "string"
        }
      },
      "required": [
        "x",
        "y",
        "text"
      ]
    }
  },
  {
    "name": "set_fill_color",
    "description": "Set the fill color of a node in Figma can be TextNode or FrameNode",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node to modify",
          "type": "string"
        },
        "r": {
          "description": "Red component (0-1)",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "g": {
          "description": "Green component (0-1)",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "b": {
          "description": "Blue component (0-1)",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "a": {
          "description": "Alpha component (0-1)",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      },
      "required": [
        "nodeId",
        "r",
        "g",
        "b"
      ]
    }
  },
  {
    "name": "set_stroke_color",
    "description": "Set the stroke color of a node in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node to modify",
          "type": "string"
        },
        "r": {
          "description": "Red component (0-1)",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "g": {
          "description": "Green component (0-1)",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "b": {
          "description": "Blue component (0-1)",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "a": {
          "description": "Alpha component (0-1)",
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "weight": {
          "description": "Stroke weight",
          "type": "number"
        }
      },
      "required": [
        "nodeId",
        "r",
        "g",
        "b"
      ]
    }
  },
  {
    "name": "move_node",
    "description": "Move a node to a new position in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node to move",
          "type": "string"
        },
        "x": {
          "description": "New X position",
          "type": "number"
        },
        "y": {
          "description": "New Y position",
          "type": "number"
        }
      },
      "required": [
        "nodeId",
        "x",
        "y"
      ]
    }
  },
  {
    "name": "clone_node",
    "description": "Clone an existing node in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node to clone",
          "type": "string"
        },
        "x": {
          "description": "New X position for the clone",
          "type": "number"
        },
        "y": {
          "description": "New Y position for the clone",
          "type": "number"
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "resize_node",
    "description": "Resize a node in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node to resize",
          "type": "string"
        },
        "width": {
          "description": "New width",
          "type": "number"
        },
        "height": {
          "description": "New height",
          "type": "number"
        }
      },
      "required": [
        "nodeId",
        "width",
        "height"
      ]
    }
  },
  {
    "name": "delete_node",
    "description": "Delete a node from Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node to delete",
          "type": "string"
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "delete_multiple_nodes",
    "description": "Delete multiple nodes from Figma at once",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeIds": {
          "description": "Array of node IDs to delete",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "nodeIds"
      ]
    }
  },
  {
    "name": "export_node_as_image",
    "description": "Export a node as an image from Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node to export",
          "type": "string"
        },
        "scale": {
          "description": "Export scale",
          "type": "number"
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "set_text_content",
    "description": "Set the text content of an existing text node in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the text node to modify",
          "type": "string"
        },
        "text": {
          "description": "New text content",
          "type": "string"
        }
      },
      "required": [
        "nodeId",
        "text"
      ]
    }
  },
  {
    "name": "get_styles",
    "description": "Get all styles from the current Figma document",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "get_local_components",
    "description": "Get all local components from the Figma document",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "get_annotations",
    "description": "Get all annotations in the current document or specific node",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "node ID to get annotations for specific node",
          "type": "string"
        },
        "includeCategories": {
          "description": "Whether to include category information",
          "type": "boolean"
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "set_annotation",
    "description": "Create or update an annotation",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node to annotate",
          "type": "string"
        },
        "annotationId": {
          "description": "The ID of the annotation to update (if updating existing annotation)",
          "type": "string"
        },
        "labelMarkdown": {
          "description": "The annotation text in markdown format",
          "type": "string"
        },
        "categoryId": {
          "description": "The ID of the annotation category",
          "type": "string"
        },
        "properties": {
          "description": "Additional properties for the annotation",
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string"
              }
            }
          }
        }
      },
      "required": [
        "nodeId",
        "labelMarkdown"
      ]
    }
  },
  {
    "name": "set_multiple_annotations",
    "description": "Set multiple annotations parallelly in a node",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node containing the elements to annotate",
          "type": "string"
        },
        "annotations": {
          "description": "Array of annotations to apply",
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "nodeId": {
                "description": "The ID of the node to annotate",
                "type": "string"
              },
              "labelMarkdown": {
                "description": "The annotation text in markdown format",
                "type": "string"
              },
              "categoryId": {
                "description": "The ID of the annotation category",
                "type": "string"
              },
              "annotationId": {
                "description": "The ID of the annotation to update (if updating existing annotation)",
                "type": "string"
              },
              "properties": {
                "description": "Additional properties for the annotation",
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "type": {
                      "type": "string"
                    }
                  }
                }
              }
            },
            "required": ["nodeId", "labelMarkdown"]
          }
        }
      },
      "required": [
        "nodeId",
        "annotations"
      ]
    }
  },
  {
    "name": "create_component_instance",
    "description": "Create an instance of a component in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "componentKey": {
          "description": "Key of the component to instantiate",
          "type": "string"
        },
        "x": {
          "description": "X position",
          "type": "number"
        },
        "y": {
          "description": "Y position",
          "type": "number"
        }
      },
      "required": [
        "componentKey",
        "x",
        "y"
      ]
    }
  },
  {
    "name": "get_instance_overrides",
    "description": "Get all override properties from a selected component instance. These overrides can be applied to other instances, which will swap them to match the source component.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "Optional ID of the component instance to get overrides from. If not provided, currently selected instance will be used.",
          "type": "string"
        }
      },
      "required": []
    }
  },
  {
    "name": "set_instance_overrides",
    "description": "Apply previously copied overrides to selected component instances. Target instances will be swapped to the source component and all copied override properties will be applied.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "sourceInstanceId": {
          "description": "ID of the source component instance",
          "type": "string"
        },
        "targetNodeIds": {
          "description": "Array of target instance IDs. Currently selected instances will be used.",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "sourceInstanceId",
        "targetNodeIds"
      ]
    }
  },
  {
    "name": "set_corner_radius",
    "description": "Set the corner radius of a node in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node to modify",
          "type": "string"
        },
        "radius": {
          "description": "Corner radius value in pixels",
          "type": "number",
          "minimum": 0
        },
        "corners": {
          "description": "Optional array of 4 booleans to specify which corners to round [topLeft, topRight, bottomRight, bottomLeft]",
          "type": "array",
          "items": {
            "type": "boolean"
          },
          "minItems": 4,
          "maxItems": 4
        }
      },
      "required": [
        "nodeId",
        "radius"
      ]
    }
  },
  {
    "name": "scan_text_nodes",
    "description": "Scan all text nodes in the selected Figma node",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "ID of the node to scan",
          "type": "string"
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "scan_nodes_by_types",
    "description": "Scan for child nodes with specific types in the selected Figma node",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "ID of the node to scan",
          "type": "string"
        },
        "types": {
          "description": "Array of node types to find in the child nodes (e.g. ['COMPONENT', 'FRAME'])",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "nodeId",
        "types"
      ]
    }
  },
  {
    "name": "set_multiple_text_contents",
    "description": "Set multiple text contents parallelly in a node",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node containing the text nodes to replace",
          "type": "string"
        },
        "text": {
          "description": "Array of text node IDs and their replacement texts",
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "nodeId": {
                "description": "The ID of the text node",
                "type": "string"
              },
              "text": {
                "description": "The replacement text",
                "type": "string"
              }
            },
            "required": ["nodeId", "text"]
          }
        }
      },
      "required": [
        "nodeId",
        "text"
      ]
    }
  },
  {
    "name": "set_layout_mode",
    "description": "Set the layout mode and wrap behavior of a frame in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the frame to modify",
          "type": "string"
        },
        "layoutMode": {
          "description": "Layout mode for the frame",
          "type": "string",
          "enum": [
            "NONE",
            "HORIZONTAL",
            "VERTICAL"
          ]
        },
        "layoutWrap": {
          "description": "Whether the auto-layout frame wraps its children",
          "type": "string",
          "enum": [
            "NO_WRAP",
            "WRAP"
          ]
        }
      },
      "required": [
        "nodeId",
        "layoutMode"
      ]
    }
  },
  {
    "name": "set_padding",
    "description": "Set padding values for an auto-layout frame in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the frame to modify",
          "type": "string"
        },
        "paddingTop": {
          "description": "Top padding value",
          "type": "number"
        },
        "paddingRight": {
          "description": "Right padding value",
          "type": "number"
        },
        "paddingBottom": {
          "description": "Bottom padding value",
          "type": "number"
        },
        "paddingLeft": {
          "description": "Left padding value",
          "type": "number"
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "set_axis_align",
    "description": "Set primary and counter axis alignment for an auto-layout frame in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the frame to modify",
          "type": "string"
        },
        "primaryAxisAlignItems": {
          "description": "Primary axis alignment (MIN/MAX = left/right in horizontal, top/bottom in vertical). Note: When set to SPACE_BETWEEN, itemSpacing will be ignored as children will be evenly spaced.",
          "type": "string",
          "enum": [
            "MIN",
            "MAX",
            "CENTER",
            "SPACE_BETWEEN"
          ]
        },
        "counterAxisAlignItems": {
          "description": "Counter axis alignment (MIN/MAX = top/bottom in horizontal, left/right in vertical)",
          "type": "string",
          "enum": [
            "MIN",
            "MAX",
            "CENTER",
            "BASELINE"
          ]
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "set_layout_sizing",
    "description": "Set horizontal and vertical sizing modes for an auto-layout frame in Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the frame to modify",
          "type": "string"
        },
        "layoutSizingHorizontal": {
          "description": "Horizontal sizing mode (HUG for frames/text only, FILL for auto-layout children only)",
          "type": "string",
          "enum": [
            "FIXED",
            "HUG",
            "FILL"
          ]
        },
        "layoutSizingVertical": {
          "description": "Vertical sizing mode (HUG for frames/text only, FILL for auto-layout children only)",
          "type": "string",
          "enum": [
            "FIXED",
            "HUG",
            "FILL"
          ]
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "set_item_spacing",
    "description": "Set distance between children in an auto-layout frame",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the frame to modify",
          "type": "string"
        },
        "itemSpacing": {
          "description": "Distance between children. Note: This value will be ignored if primaryAxisAlignItems is set to SPACE_BETWEEN.",
          "type": "number"
        },
        "counterAxisSpacing": {
          "description": "Distance between wrapped rows/columns. Only works when layoutWrap is set to WRAP.",
          "type": "number"
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "get_reactions",
    "description": "Get Figma Prototyping Reactions from multiple nodes for analyzing prototype flows and interactions. CRITICAL: The output MUST be processed using the 'reaction_to_connector_strategy' prompt IMMEDIATELY to generate parameters for connector lines via the 'create_connections' tool.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeIds": {
          "description": "Array of node IDs to get reactions from",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "nodeIds"
      ]
    }
  },
  {
    "name": "set_default_connector",
    "description": "Set a copied connector node as the default connector",
    "inputSchema": {
      "type": "object",
      "properties": {
        "connectorId": {
          "description": "The ID of the connector node to set as default",
          "type": "string"
        }
      },
      "required": []
    }
  },
  {
    "name": "create_connections",
    "description": "Create connections between nodes using the default connector style",
    "inputSchema": {
      "type": "object",
      "properties": {
        "connections": {
          "description": "Array of connection objects, each with startNodeId, endNodeId, and optional text",
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "startNodeId": {
                "description": "ID of the starting node",
                "type": "string"
              },
              "endNodeId": {
                "description": "ID of the ending node",
                "type": "string"
              },
              "text": {
                "description": "Optional text to display on the connector",
                "type": "string"
              }
            },
            "required": ["startNodeId", "endNodeId"]
          }
        }
      },
      "required": [
        "connections"
      ]
    }
  },
  {
    "name": "set_focus",
    "description": "Set focus on a specific node in Figma by selecting it and scrolling viewport to it",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "description": "The ID of the node to focus on",
          "type": "string"
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "set_selections",
    "description": "Set selection to multiple nodes in Figma and scroll viewport to show them",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeIds": {
          "description": "Array of node IDs to select",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "nodeIds"
      ]
    }
  },
  {
    "name": "join_channel",
    "description": "Join a specific channel to communicate with Figma",
    "inputSchema": {
      "type": "object",
      "properties": {
        "channel": {
          "description": "The name of the channel to join",
          "type": "string"
        }
      },
      "required": [
        "channel"
      ]
    }
  },
  {
    "name": "figma_get_comments",
    "description": "Get all comments from a Figma file using REST API. Requires OAuth authentication.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "fileKey": {
          "type": "string",
          "description": "Figma file key (optional if set in config)"
        }
      },
      "required": []
    }
  },
  {
    "name": "figma_post_reply",
    "description": "Post a reply to a comment using Figma REST API. Requires OAuth authentication.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "commentId": {
          "type": "string",
          "description": "ID of the comment to reply to"
        },
        "message": {
          "type": "string",
          "description": "Reply message text"
        }
      },
      "required": [
        "commentId",
        "message"
      ]
    }
  },
  {
    "name": "figma_post_reaction",
    "description": "Post an emoji reaction to a comment using Figma REST API. Requires OAuth authentication.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "commentId": {
          "type": "string",
          "description": "ID of the comment to react to"
        },
        "emoji": {
          "type": "string",
          "description": "Emoji character to react with"
        }
      },
      "required": [
        "commentId",
        "emoji"
      ]
    }
  },
  {
    "name": "figma_get_reactions",
    "description": "Get all reactions for a comment using Figma REST API. Requires OAuth authentication.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "commentId": {
          "type": "string",
          "description": "ID of the comment to get reactions for"
        }
      },
      "required": [
        "commentId"
      ]
    }
  },
  {
    "name": "figma_delete_reaction",
    "description": "Delete a reaction from a comment using Figma REST API. Requires OAuth authentication.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "commentId": {
          "type": "string",
          "description": "ID of the comment"
        },
        "emoji": {
          "type": "string",
          "description": "Emoji character to remove"
        }
      },
      "required": [
        "commentId",
        "emoji"
      ]
    }
  },
  {
    "name": "figma_get_config",
    "description": "Get OAuth configuration status (access token, file key, user info)",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "figma_set_config",
    "description": "Set OAuth configuration (access token, file key, etc.)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "accessToken": {
          "type": "string",
          "description": "Figma OAuth access token"
        },
        "refreshToken": {
          "type": "string",
          "description": "Figma OAuth refresh token"
        },
        "fileKey": {
          "type": "string",
          "description": "Default Figma file key"
        }
      },
      "required": []
    }
  },
  {
    "name": "send_notification",
    "description": "Send a desktop notification to the user",
    "inputSchema": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "description": "Notification title"
        },
        "body": {
          "type": "string",
          "description": "Notification body text"
        }
      },
      "required": [
        "title",
        "body"
      ]
    }
  },
  {
    "name": "get_active_channels",
    "description": "Get list of active WebSocket channels for debugging connection issues",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "connection_diagnostics",
    "description": "Run diagnostics on WebSocket connection and report status",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  }
];
