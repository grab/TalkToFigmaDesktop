/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.mcp

import io.modelcontextprotocol.kotlin.sdk.*
import io.modelcontextprotocol.kotlin.sdk.server.Server
import kotlinx.serialization.json.*

/**
 * Layout service for Figma MCP tools
 * Handles layout-related operations for Figma frames
 */
object LayoutService : BaseFigmaService() {
    
    /**
     * Register all layout-related tools with the MCP server
     */
    fun registerTools(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        logger.info { "Registering layout service tools..." }
        
        registerSetLayoutMode(server, figmaCommandSender)
        registerSetPadding(server, figmaCommandSender)
        registerSetAxisAlign(server, figmaCommandSender)
        registerSetLayoutSizing(server, figmaCommandSender)
        registerSetItemSpacing(server, figmaCommandSender)
        
        logger.info { "Layout service tools registered successfully" }
    }
    
    /**
     * Set the layout mode and wrap behavior of a frame in Figma
     */
    private fun registerSetLayoutMode(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_layout_mode",
            description = "Set the layout mode and wrap behavior of a frame in Figma",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the frame to modify")
                    }
                    putJsonObject("layoutMode") {
                        put("type", "string")
                        put("enum", JsonArray(listOf(JsonPrimitive("NONE"), JsonPrimitive("HORIZONTAL"), JsonPrimitive("VERTICAL"))))
                        put("description", "Layout mode for the frame")
                    }
                    putJsonObject("layoutWrap") {
                        put("type", "string")
                        put("enum", JsonArray(listOf(JsonPrimitive("NO_WRAP"), JsonPrimitive("WRAP"))))
                        put("description", "Whether the auto-layout frame wraps its children")
                    }
                },
                required = listOf("nodeId", "layoutMode")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    val layoutMode = request.arguments["layoutMode"].safeString("layoutMode")
                    val layoutWrap = request.arguments["layoutWrap"]?.safeStringOrDefault("NO_WRAP") ?: "NO_WRAP"
                    
                    val params = mapOf(
                        "nodeId" to nodeId,
                        "layoutMode" to layoutMode,
                        "layoutWrap" to layoutWrap
                    )
                    
                    val result = figmaCommandSender("set_layout_mode", params)
                    createSuccessResponse("Set layout mode to $layoutMode with $layoutWrap: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("setting layout mode", e)
                }
            }
        }
    }
    
    /**
     * Set padding values for an auto-layout frame in Figma
     */
    private fun registerSetPadding(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_padding",
            description = "Set padding values for an auto-layout frame in Figma",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the frame to modify")
                    }
                    putJsonObject("paddingTop") {
                        put("type", "number")
                        put("description", "Top padding value")
                    }
                    putJsonObject("paddingRight") {
                        put("type", "number")
                        put("description", "Right padding value")
                    }
                    putJsonObject("paddingBottom") {
                        put("type", "number")
                        put("description", "Bottom padding value")
                    }
                    putJsonObject("paddingLeft") {
                        put("type", "number")
                        put("description", "Left padding value")
                    }
                },
                required = listOf("nodeId")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    
                    val params = mutableMapOf<String, Any>("nodeId" to nodeId)
                    
                    request.arguments["paddingTop"]?.jsonPrimitive?.double?.let { params["paddingTop"] = it }
                    request.arguments["paddingRight"]?.jsonPrimitive?.double?.let { params["paddingRight"] = it }
                    request.arguments["paddingBottom"]?.jsonPrimitive?.double?.let { params["paddingBottom"] = it }
                    request.arguments["paddingLeft"]?.jsonPrimitive?.double?.let { params["paddingLeft"] = it }
                    
                    val result = figmaCommandSender("set_padding", params)
                    createSuccessResponse("Set padding for frame: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("setting padding", e)
                }
            }
        }
    }
    
    /**
     * Set primary and counter axis alignment for an auto-layout frame in Figma
     */
    private fun registerSetAxisAlign(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_axis_align",
            description = "Set primary and counter axis alignment for an auto-layout frame in Figma",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the frame to modify")
                    }
                    putJsonObject("primaryAxisAlignItems") {
                        put("type", "string")
                        put("enum", JsonArray(listOf(JsonPrimitive("MIN"), JsonPrimitive("MAX"), JsonPrimitive("CENTER"), JsonPrimitive("SPACE_BETWEEN"))))
                        put("description", "Primary axis alignment (MIN/MAX = left/right in horizontal, top/bottom in vertical). Note: When set to SPACE_BETWEEN, itemSpacing will be ignored as children will be evenly spaced.")
                    }
                    putJsonObject("counterAxisAlignItems") {
                        put("type", "string")
                        put("enum", JsonArray(listOf(JsonPrimitive("MIN"), JsonPrimitive("MAX"), JsonPrimitive("CENTER"), JsonPrimitive("BASELINE"))))
                        put("description", "Counter axis alignment (MIN/MAX = top/bottom in horizontal, left/right in vertical)")
                    }
                },
                required = listOf("nodeId")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    
                    val params = mutableMapOf<String, Any>("nodeId" to nodeId)
                    
                    request.arguments["primaryAxisAlignItems"]?.jsonPrimitive?.content?.let { params["primaryAxisAlignItems"] = it }
                    request.arguments["counterAxisAlignItems"]?.jsonPrimitive?.content?.let { params["counterAxisAlignItems"] = it }
                    
                    val result = figmaCommandSender("set_axis_align", params)
                    createSuccessResponse("Set axis alignment for frame: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("setting axis alignment", e)
                }
            }
        }
    }
    
    /**
     * Set horizontal and vertical sizing modes for an auto-layout frame in Figma
     */
    private fun registerSetLayoutSizing(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_layout_sizing",
            description = "Set horizontal and vertical sizing modes for an auto-layout frame in Figma",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the frame to modify")
                    }
                    putJsonObject("layoutSizingHorizontal") {
                        put("type", "string")
                        put("enum", JsonArray(listOf(JsonPrimitive("FIXED"), JsonPrimitive("HUG"), JsonPrimitive("FILL"))))
                        put("description", "Horizontal sizing mode (HUG for frames/text only, FILL for auto-layout children only)")
                    }
                    putJsonObject("layoutSizingVertical") {
                        put("type", "string")
                        put("enum", JsonArray(listOf(JsonPrimitive("FIXED"), JsonPrimitive("HUG"), JsonPrimitive("FILL"))))
                        put("description", "Vertical sizing mode (HUG for frames/text only, FILL for auto-layout children only)")
                    }
                },
                required = listOf("nodeId")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    
                    val params = mutableMapOf<String, Any>("nodeId" to nodeId)
                    
                    request.arguments["layoutSizingHorizontal"]?.jsonPrimitive?.content?.let { params["layoutSizingHorizontal"] = it }
                    request.arguments["layoutSizingVertical"]?.jsonPrimitive?.content?.let { params["layoutSizingVertical"] = it }
                    
                    val result = figmaCommandSender("set_layout_sizing", params)
                    createSuccessResponse("Set layout sizing for frame: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("setting layout sizing", e)
                }
            }
        }
    }
    
    /**
     * Set distance between children in an auto-layout frame
     */
    private fun registerSetItemSpacing(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_item_spacing",
            description = "Set distance between children in an auto-layout frame",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the frame to modify")
                    }
                    putJsonObject("itemSpacing") {
                        put("type", "number")
                        put("description", "Distance between children. Note: This value will be ignored if primaryAxisAlignItems is set to SPACE_BETWEEN.")
                    }
                    putJsonObject("counterAxisSpacing") {
                        put("type", "number")
                        put("description", "Distance between wrapped rows/columns. Only works when layoutWrap is set to WRAP.")
                    }
                },
                required = listOf("nodeId")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    
                    val params = mutableMapOf<String, Any>("nodeId" to nodeId)
                    
                    request.arguments["itemSpacing"]?.jsonPrimitive?.double?.let { params["itemSpacing"] = it }
                    request.arguments["counterAxisSpacing"]?.jsonPrimitive?.double?.let { params["counterAxisSpacing"] = it }
                    
                    val result = figmaCommandSender("set_item_spacing", params)
                    createSuccessResponse("Set item spacing for frame: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("setting item spacing", e)
                }
            }
        }
    }
} 
