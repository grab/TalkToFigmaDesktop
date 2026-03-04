/**
 * Figma MCP Tools Definitions
 * Total 52 tools (40 from original + 12 additional)
 *
 * Auto-generated from: https://raw.githubusercontent.com/grab/cursor-talk-to-figma-mcp/refs/heads/main/src/talk_to_figma_mcp/server.ts
 * Generated at: 2026-03-04T08:32:28.573Z
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
          "description": "Array of node IDs to get information about"
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
        "height",
        "r",
        "g",
        "b",
        "r",
        "g",
        "b"
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
        }
      },
      "required": [
        "x",
        "y",
        "text",
        "r",
        "g",
        "b"
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
          "description": "Array of node IDs to delete"
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
        "properties": {},
        "type": {
          "type": "string"
        }
      },
      "required": [
        "nodeId",
        "labelMarkdown",
        "properties",
        "type"
      ]
    }
  },
  {
    "name": "set_multiple_annotations",
    "description": "Set multiple annotations parallelly in a node",
    "inputSchema": {
      "type": "object",
      "properties": {
        "annotations": {},
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
        "properties": {},
        "type": {
          "description": "Array of annotations to apply",
          "type": "string"
        }
      },
      "required": [
        "annotations",
        "nodeId",
        "labelMarkdown",
        "properties",
        "type"
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
          "description": "Array of target instance IDs. Currently selected instances will be used."
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
          "description": "Corner radius value",
          "type": "number",
          "minimum": 0
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
        "types": {}
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
        "text": {
          "description": "The replacement text",
          "type": "string"
        },
        "nodeId": {
          "description": "The ID of the text node",
          "type": "string"
        }
      },
      "required": [
        "text",
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
    "description": "Get Figma Prototyping Reactions from multiple nodes. CRITICAL: The output MUST be processed using the 'reaction_to_connector_strategy' prompt IMMEDIATELY to generate parameters for connector lines via the 'create_connections' tool.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeIds": {
          "description": "Array of node IDs to get reactions from"
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
        "connections": {},
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
      "required": [
        "connections",
        "startNodeId",
        "endNodeId"
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
          "description": "Array of node IDs to select"
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
  },
  {
    "name": "get_component_properties",
    "description": "Get all component properties from a component instance node, including property names, types (VARIANT, BOOLEAN, TEXT, INSTANCE_SWAP), current values, and available options for VARIANT types. Use this before set_component_properties to discover valid property names.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "type": "string",
          "description": "The ID of the component instance node"
        }
      },
      "required": [
        "nodeId"
      ]
    }
  },
  {
    "name": "set_component_properties",
    "description": "Set one or more component properties on a component instance node. Supports VARIANT (string), BOOLEAN (true/false), TEXT (string), INSTANCE_SWAP (component key). Use get_component_properties first to discover property names and allowed values.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "nodeId": {
          "type": "string",
          "description": "The ID of the component instance node to modify"
        },
        "properties": {
          "type": "object",
          "description": "Map of property names to values. Names must match exactly as returned by get_component_properties."
        }
      },
      "required": [
        "nodeId",
        "properties"
      ]
    }
  }
];
