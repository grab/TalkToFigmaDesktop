/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.mcp

import io.modelcontextprotocol.kotlin.sdk.Tool
import io.modelcontextprotocol.kotlin.sdk.server.Server
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.putJsonObject
import kotlinx.serialization.json.put

/**
 * Service for managing Figma export operations
 * Provides tools for exporting nodes as images in various formats
 */
object ExportService : BaseFigmaService() {

    /**
     * Register all export-related tools
     */
    fun registerTools(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        // Register export tools
        registerExportNodeAsImage(server, figmaCommandSender)
        
        logger.info { "Export service tools registered successfully" }
    }

    /**
     * Export a node as an image (PNG, JPG, SVG, or PDF)
     */
    private fun registerExportNodeAsImage(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "export_node_as_image",
            description = "Export a node as an image (PNG, JPG, SVG, or PDF) - limited support on image currently returning base64 as text",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the node to export")
                    }
                    putJsonObject("format") {
                        put("type", "string")
                        put("enum", JsonArray(listOf(JsonPrimitive("PNG"), JsonPrimitive("JPG"), JsonPrimitive("SVG"), JsonPrimitive("PDF"))))
                        put("description", "Export format (default: PNG)")
                    }
                    putJsonObject("scale") {
                        put("type", "number")
                        put("minimum", 0.1)
                        put("maximum", 4.0)
                        put("description", "Export scale factor (default: 1.0)")
                    }
                },
                required = listOf("nodeId")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    val format = request.arguments["format"].safeStringOrDefault("PNG")
                    val scale = request.arguments["scale"].safeDoubleOrDefault(1.0)
                    
                    val params = mapOf(
                        "nodeId" to nodeId,
                        "format" to format,
                        "scale" to scale
                    )
                    
                    val result = figmaCommandSender("export_node_as_image", params)
                    createSuccessResponse("Exported node as $format image with scale $scale: $result")
                } catch (e: Exception) {
                    createErrorResponse("exporting node as image", e)
                }
            }
        }
    }
} 
