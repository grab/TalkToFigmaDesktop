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
 * Style service for Figma MCP tools
 * Handles styling operations for Figma elements
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
     */
    private fun registerSetFillColor(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_fill_color",
            description = "Set the fill color of a node in Figma can be TextNode or FrameNode",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the node to modify")
                    }
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
                },
                required = listOf("nodeId", "r", "g", "b")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    val r = request.arguments["r"].safeDouble("r")
                    val g = request.arguments["g"].safeDouble("g")
                    val b = request.arguments["b"].safeDouble("b")
                    val a = request.arguments["a"]?.safeDoubleOrDefault(1.0) ?: 1.0
                    
                    val params = mapOf(
                        "nodeId" to nodeId,
                        "color" to mapOf(
                            "r" to r,
                            "g" to g,
                            "b" to b,
                            "a" to a
                        )
                    )
                    
                    val result = figmaCommandSender("set_fill_color", params)
                    createSuccessResponse("Set fill color of node to RGBA($r, $g, $b, $a): ${result}")
                } catch (e: Exception) {
                    createErrorResponse("setting fill color", e)
                }
            }
        }
    }
    
    /**
     * Set the stroke color of a node in Figma
     */
    private fun registerSetStrokeColor(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_stroke_color",
            description = "Set the stroke color of a node in Figma",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the node to modify")
                    }
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
                    putJsonObject("weight") {
                        put("type", "number")
                        put("minimum", 0)
                        put("description", "Stroke weight")
                    }
                },
                required = listOf("nodeId", "r", "g", "b")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    val r = request.arguments["r"].safeDouble("r")
                    val g = request.arguments["g"].safeDouble("g")
                    val b = request.arguments["b"].safeDouble("b")
                    val a = request.arguments["a"]?.safeDoubleOrDefault(1.0) ?: 1.0
                    val weight = request.arguments["weight"]?.safeDoubleOrDefault(1.0) ?: 1.0
                    
                    val params = mapOf(
                        "nodeId" to nodeId,
                        "color" to mapOf(
                            "r" to r,
                            "g" to g,
                            "b" to b,
                            "a" to a
                        ),
                        "weight" to weight
                    )
                    
                    val result = figmaCommandSender("set_stroke_color", params)
                    createSuccessResponse("Set stroke color of node to RGBA($r, $g, $b, $a) with weight $weight: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("setting stroke color", e)
                }
            }
        }
    }
    
    /**
     * Set the corner radius of a node in Figma
     */
    private fun registerSetCornerRadius(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_corner_radius",
            description = "Set the corner radius of a node in Figma",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the node to modify")
                    }
                    putJsonObject("radius") {
                        put("type", "number")
                        put("minimum", 0)
                        put("description", "Corner radius value")
                    }
                    putJsonObject("corners") {
                        put("type", "array")
                        put("description", "Optional array of 4 booleans to specify which corners to round [topLeft, topRight, bottomRight, bottomLeft]")
                        putJsonObject("items") {
                            put("type", "boolean")
                        }
                        put("minItems", 4)
                        put("maxItems", 4)
                    }
                },
                required = listOf("nodeId", "radius")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    val radius = request.arguments["radius"].safeDouble("radius")
                    
                    val params = mutableMapOf<String, Any>(
                        "nodeId" to nodeId,
                        "radius" to radius
                    )
                    
                    // Handle corners array if provided (only include if actually provided)
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
                    createSuccessResponse("Set corner radius of node to ${radius}px: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("setting corner radius", e)
                }
            }
        }
    }
} 
