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
 * Creation service for Figma MCP tools
 * Handles creation of new elements in Figma
 */
object CreationService : BaseFigmaService() {
    
    /**
     * Register all creation-related tools with the MCP server
     */
    fun registerTools(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        logger.info { "Registering creation service tools..." }
        
        registerCreateRectangle(server, figmaCommandSender)
        registerCreateFrame(server, figmaCommandSender)
        registerCreateText(server, figmaCommandSender)
        
        logger.info { "Creation service tools registered successfully" }
    }
    
    /**
     * Create a new rectangle in Figma
     */
    private fun registerCreateRectangle(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "create_rectangle",
            description = "Create a new rectangle in Figma",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("x") {
                        put("type", "number")
                        put("description", "X position")
                    }
                    putJsonObject("y") {
                        put("type", "number")
                        put("description", "Y position")
                    }
                    putJsonObject("width") {
                        put("type", "number")
                        put("description", "Width of the rectangle")
                    }
                    putJsonObject("height") {
                        put("type", "number")
                        put("description", "Height of the rectangle")
                    }
                    putJsonObject("name") {
                        put("type", "string")
                        put("description", "Optional name for the rectangle")
                    }
                    putJsonObject("parentId") {
                        put("type", "string")
                        put("description", "Optional parent node ID to append the rectangle to")
                    }
                },
                required = listOf("x", "y", "width", "height")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val x = request.arguments["x"].safeDouble("x")
                    val y = request.arguments["y"].safeDouble("y")
                    val width = request.arguments["width"].safeDouble("width")
                    val height = request.arguments["height"].safeDouble("height")
                    val name = request.arguments["name"]?.safeStringOrDefault("Rectangle")
                    val parentId = request.arguments["parentId"]?.jsonPrimitive?.content
                    
                    val params = mutableMapOf<String, Any>(
                        "x" to x,
                        "y" to y,
                        "width" to width,
                        "height" to height,
                        "name" to (name ?: "Rectangle")
                    )
                    
                    if (parentId != null) {
                        params["parentId"] = parentId
                    }
                    
                    val result = figmaCommandSender("create_rectangle", params)
                    createSuccessResponse("Created rectangle: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("creating rectangle", e)
                }
            }
        }
    }
    
    /**
     * Create a new frame in Figma
     */
    private fun registerCreateFrame(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "create_frame",
            description = "Create a new frame in Figma",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("x") {
                        put("type", "number")
                        put("description", "X position")
                    }
                    putJsonObject("y") {
                        put("type", "number")
                        put("description", "Y position")
                    }
                    putJsonObject("width") {
                        put("type", "number")
                        put("description", "Width of the frame")
                    }
                    putJsonObject("height") {
                        put("type", "number")
                        put("description", "Height of the frame")
                    }
                    putJsonObject("name") {
                        put("type", "string")
                        put("description", "Optional name for the frame")
                    }
                    putJsonObject("parentId") {
                        put("type", "string")
                        put("description", "Optional parent node ID to append the frame to")
                    }
                    putJsonObject("fillColor") {
                        put("type", "object")
                        put("description", "Fill color in RGBA format")
                        putJsonObject("properties") {
                            putJsonObject("r") {
                                put("type", "number")
                                put("minimum", 0)
                                put("maximum", 1)
                                put("description", "Red component (0-1)")
                            }
                            putJsonObject("g") {
                                put("type", "number")
                                put("minimum", 0)
                                put("maximum", 1)
                                put("description", "Green component (0-1)")
                            }
                            putJsonObject("b") {
                                put("type", "number")
                                put("minimum", 0)
                                put("maximum", 1)
                                put("description", "Blue component (0-1)")
                            }
                            putJsonObject("a") {
                                put("type", "number")
                                put("minimum", 0)
                                put("maximum", 1)
                                put("description", "Alpha component (0-1)")
                            }
                        }
                    }
                    putJsonObject("layoutMode") {
                        put("type", "string")
                        put("enum", JsonArray(listOf(JsonPrimitive("NONE"), JsonPrimitive("HORIZONTAL"), JsonPrimitive("VERTICAL"))))
                        put("description", "Auto-layout mode for the frame")
                    }
                },
                required = listOf("x", "y", "width", "height")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val x = request.arguments["x"].safeDouble("x")
                    val y = request.arguments["y"].safeDouble("y")
                    val width = request.arguments["width"].safeDouble("width")
                    val height = request.arguments["height"].safeDouble("height")
                    val name = request.arguments["name"]?.safeStringOrDefault("Frame")
                    val parentId = request.arguments["parentId"]?.jsonPrimitive?.content
                    
                    val params = mutableMapOf<String, Any>(
                        "x" to x,
                        "y" to y,
                        "width" to width,
                        "height" to height,
                        "name" to (name ?: "Frame")
                    )
                    
                    if (parentId != null) {
                        params["parentId"] = parentId
                    }
                    
                    // Handle fillColor if provided
                    request.arguments["fillColor"]?.jsonObject?.let { fillColor ->
                        val colorMap = mutableMapOf<String, Double>()
                        fillColor["r"]?.jsonPrimitive?.double?.let { colorMap["r"] = it }
                        fillColor["g"]?.jsonPrimitive?.double?.let { colorMap["g"] = it }
                        fillColor["b"]?.jsonPrimitive?.double?.let { colorMap["b"] = it }
                        fillColor["a"]?.jsonPrimitive?.double?.let { colorMap["a"] = it }
                        if (colorMap.isNotEmpty()) {
                            params["fillColor"] = colorMap
                        }
                    }
                    
                    // Handle layoutMode if provided
                    request.arguments["layoutMode"]?.jsonPrimitive?.content?.let { layoutMode ->
                        params["layoutMode"] = layoutMode
                    }
                    
                    val result = figmaCommandSender("create_frame", params)
                    createSuccessResponse("Created frame: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("creating frame", e)
                }
            }
        }
    }
    
    /**
     * Create a new text element in Figma
     */
    private fun registerCreateText(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "create_text",
            description = "Create a new text element in Figma",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("x") {
                        put("type", "number")
                        put("description", "X position")
                    }
                    putJsonObject("y") {
                        put("type", "number")
                        put("description", "Y position")
                    }
                    putJsonObject("text") {
                        put("type", "string")
                        put("description", "Text content")
                    }
                    putJsonObject("fontSize") {
                        put("type", "number")
                        put("description", "Font size (default: 14)")
                    }
                    putJsonObject("fontWeight") {
                        put("type", "number")
                        put("description", "Font weight (e.g., 400 for Regular, 700 for Bold)")
                    }
                    putJsonObject("fontColor") {
                        put("type", "object")
                        put("description", "Font color in RGBA format")
                        putJsonObject("properties") {
                            putJsonObject("r") {
                                put("type", "number")
                                put("minimum", 0)
                                put("maximum", 1)
                                put("description", "Red component (0-1)")
                            }
                            putJsonObject("g") {
                                put("type", "number")
                                put("minimum", 0)
                                put("maximum", 1)
                                put("description", "Green component (0-1)")
                            }
                            putJsonObject("b") {
                                put("type", "number")
                                put("minimum", 0)
                                put("maximum", 1)
                                put("description", "Blue component (0-1)")
                            }
                            putJsonObject("a") {
                                put("type", "number")
                                put("minimum", 0)
                                put("maximum", 1)
                                put("description", "Alpha component (0-1)")
                            }
                        }
                    }
                    putJsonObject("name") {
                        put("type", "string")
                        put("description", "Semantic layer name for the text node")
                    }
                    putJsonObject("parentId") {
                        put("type", "string")
                        put("description", "Optional parent node ID to append the text to")
                    }
                },
                required = listOf("x", "y", "text")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val x = request.arguments["x"].safeDouble("x")
                    val y = request.arguments["y"].safeDouble("y")
                    val text = request.arguments["text"].safeString("text")
                    val fontSize = request.arguments["fontSize"]?.safeDoubleOrDefault(14.0)
                    val fontWeight = request.arguments["fontWeight"]?.safeDoubleOrDefault(400.0)
                    val name = request.arguments["name"]?.safeStringOrDefault("Text")
                    val parentId = request.arguments["parentId"]?.jsonPrimitive?.content
                    
                    val params = mutableMapOf<String, Any>(
                        "x" to x,
                        "y" to y,
                        "text" to text,
                        "fontSize" to (fontSize ?: 14.0),
                        "fontWeight" to (fontWeight ?: 400.0),
                        "name" to (name ?: "Text")
                    )
                    
                    if (parentId != null) {
                        params["parentId"] = parentId
                    }
                    
                    // Handle fontColor if provided
                    request.arguments["fontColor"]?.jsonObject?.let { fontColor ->
                        val colorMap = mutableMapOf<String, Double>()
                        fontColor["r"]?.jsonPrimitive?.double?.let { colorMap["r"] = it }
                        fontColor["g"]?.jsonPrimitive?.double?.let { colorMap["g"] = it }
                        fontColor["b"]?.jsonPrimitive?.double?.let { colorMap["b"] = it }
                        fontColor["a"]?.jsonPrimitive?.double?.let { colorMap["a"] = it }
                        if (colorMap.isNotEmpty()) {
                            params["fontColor"] = colorMap
                        } else {
                            // Default black color
                            params["fontColor"] = mapOf("r" to 0.0, "g" to 0.0, "b" to 0.0, "a" to 1.0)
                        }
                    } ?: run {
                        // Default black color
                        params["fontColor"] = mapOf("r" to 0.0, "g" to 0.0, "b" to 0.0, "a" to 1.0)
                    }
                    
                    val result = figmaCommandSender("create_text", params)
                    createSuccessResponse("Created text: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("creating text", e)
                }
            }
        }
    }
} 
