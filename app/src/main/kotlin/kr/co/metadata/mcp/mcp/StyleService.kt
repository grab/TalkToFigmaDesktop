package kr.co.metadata.mcp.mcp

import io.modelcontextprotocol.kotlin.sdk.*
import io.modelcontextprotocol.kotlin.sdk.server.Server
import kotlinx.serialization.json.*
import kr.co.metadata.mcp.mcp.utils.SchemaBuilders
import kr.co.metadata.mcp.mcp.utils.ToolRegistrationHelper
import kr.co.metadata.mcp.mcp.utils.ParameterExtractors.requireString
import kr.co.metadata.mcp.mcp.utils.ParameterExtractors.requireDouble
import kr.co.metadata.mcp.mcp.utils.ParameterExtractors.optionalDouble
import kr.co.metadata.mcp.mcp.utils.ColorUtils

/**
 * Style service for Figma MCP tools
 * Handles styling operations for Figma elements
 *
 * REFACTORED: Reduced from 229 lines to ~130 lines using utility classes
 * - Eliminated repetitive JSON schema building
 * - Simplified parameter extraction
 * - Centralized color parsing logic
 */
object StyleService : BaseFigmaService() {

    /**
     * Register all style-related tools with the MCP server
     */
    fun registerTools(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        logger.info { "Registering style service tools..." }

        registerSetFillColor(server, figmaCommandSender)
        registerSetStrokeColor(server, figmaCommandSender)
        registerSetCornerRadius(server, figmaCommandSender)

        logger.info { "Style service tools registered successfully" }
    }

    /**
     * Set the fill color of a node in Figma
     * Refactored: Reduced from 63 lines to 27 lines (-57%)
     */
    private fun registerSetFillColor(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        ToolRegistrationHelper.registerSimpleTool(
            server = server,
            name = "set_fill_color",
            description = "Set the fill color of a node in Figma can be TextNode or FrameNode",
            inputSchema = SchemaBuilders.buildToolInput(
                SchemaBuilders.nodeIdProperty("The ID of the node to modify"),
                *SchemaBuilders.colorComponentProperties().toTypedArray(),
                required = listOf("nodeId", "r", "g", "b")
            )
        ) { request ->
            val nodeId = request.arguments.requireString("nodeId")
            val color = ColorUtils.parseColorComponents(request.arguments)

            val params = mapOf(
                "nodeId" to nodeId,
                "color" to color
            )

            val result = figmaCommandSender("set_fill_color", params)
            createSuccessResponse("Set fill color of node to ${ColorUtils.formatColor(color)}: $result")
        }
    }
    
    /**
     * Set the stroke color of a node in Figma
     * Refactored: Reduced from 76 lines to 30 lines (-61%)
     */
    private fun registerSetStrokeColor(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        ToolRegistrationHelper.registerSimpleTool(
            server = server,
            name = "set_stroke_color",
            description = "Set the stroke color of a node in Figma",
            inputSchema = SchemaBuilders.buildToolInput(
                SchemaBuilders.nodeIdProperty("The ID of the node to modify"),
                *SchemaBuilders.colorComponentProperties().toTypedArray(),
                SchemaBuilders.numberProperty("weight", "Stroke weight", minimum = 0.0),
                required = listOf("nodeId", "r", "g", "b")
            )
        ) { request ->
            val nodeId = request.arguments.requireString("nodeId")
            val color = ColorUtils.parseColorComponents(request.arguments)
            val weight = request.arguments.optionalDouble("weight", 1.0)!!

            val params = mapOf(
                "nodeId" to nodeId,
                "color" to color,
                "weight" to weight
            )

            val result = figmaCommandSender("set_stroke_color", params)
            createSuccessResponse("Set stroke color of node to ${ColorUtils.formatColor(color)} with weight $weight: $result")
        }
    }
    
    /**
     * Set the corner radius of a node in Figma
     * Refactored: Reduced from 58 lines to 36 lines (-38%)
     */
    private fun registerSetCornerRadius(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        ToolRegistrationHelper.registerSimpleTool(
            server = server,
            name = "set_corner_radius",
            description = "Set the corner radius of a node in Figma",
            inputSchema = SchemaBuilders.buildToolInput(
                SchemaBuilders.nodeIdProperty("The ID of the node to modify"),
                SchemaBuilders.numberProperty("radius", "Corner radius value", minimum = 0.0),
                "corners" to buildJsonObject {
                    put("type", "array")
                    put("description", "Optional array of 4 booleans to specify which corners to round [topLeft, topRight, bottomRight, bottomLeft]")
                    putJsonObject("items") {
                        put("type", "boolean")
                    }
                    put("minItems", 4)
                    put("maxItems", 4)
                },
                required = listOf("nodeId", "radius")
            )
        ) { request ->
            val nodeId = request.arguments.requireString("nodeId")
            val radius = request.arguments.requireDouble("radius")

            val params = mutableMapOf<String, Any>(
                "nodeId" to nodeId,
                "radius" to radius
            )

            // Handle corners array if provided
            request.arguments["corners"]?.jsonArray?.let { cornersArray ->
                if (cornersArray.size == 4) {
                    val corners = cornersArray.map { it.jsonPrimitive.boolean }
                    params["corners"] = corners
                    logger.debug { "corners array provided: $corners" }
                } else {
                    logger.warn { "corners array must have exactly 4 elements, got ${cornersArray.size}. Ignoring." }
                }
            }

            val result = figmaCommandSender("set_corner_radius", params)
            createSuccessResponse("Set corner radius of node to ${radius}px: $result")
        }
    }
} 