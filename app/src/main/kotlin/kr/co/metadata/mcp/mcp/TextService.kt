/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.mcp

import io.modelcontextprotocol.kotlin.sdk.*
import io.modelcontextprotocol.kotlin.sdk.server.Server
import kotlinx.serialization.json.*
import kotlinx.coroutines.runBlocking

/**
 * Text service for Figma MCP tools
 * Handles text-related operations for Figma elements
 */
object TextService : BaseFigmaService() {
    
    /**
     * Register all text-related tools with the MCP server
     */
    fun registerTools(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        logger.info { "Registering text service tools..." }
        
        registerSetTextContent(server, figmaCommandSender)
        registerScanTextNodes(server, figmaCommandSender)
        registerSetMultipleTextContents(server, figmaCommandSender)
        
        logger.info { "Text service tools registered successfully" }
    }
    
    /**
     * Set the text content of an existing text node in Figma
     */
    private fun registerSetTextContent(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_text_content",
            description = "Set the text content of an existing text node in Figma",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the text node to modify")
                    }
                    putJsonObject("text") {
                        put("type", "string")
                        put("description", "New text content")
                    }
                },
                required = listOf("nodeId", "text")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    val text = request.arguments["text"].safeString("text")
                    
                    val params = mapOf(
                        "nodeId" to nodeId,
                        "text" to text
                    )
                    
                    val result = figmaCommandSender("set_text_content", params)
                    createSuccessResponse("Updated text content to \"$text\": ${result}")
                } catch (e: Exception) {
                    createErrorResponse("setting text content", e)
                }
            }
        }
    }
    
    /**
     * Scan all text nodes in the selected Figma node
     */
    private fun registerScanTextNodes(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "scan_text_nodes",
            description = "Scan all text nodes in the selected Figma node",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "ID of the node to scan")
                    }
                },
                required = listOf("nodeId")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    
                    val params = mapOf(
                        "nodeId" to nodeId,
                        "useChunking" to true,
                        "chunkSize" to 10
                    )
                    
                    val result = figmaCommandSender("scan_text_nodes", params)
                    
                    // Use progress-aware response processing for scanning
                    processScanResult(result, "Text node scanning")
                } catch (e: Exception) {
                    createErrorResponse("scanning text nodes", e)
                }
            }
        }
    }
    
    /**
     * Set multiple text contents parallelly in a node
     */
    private fun registerSetMultipleTextContents(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_multiple_text_contents",
            description = "Set multiple text contents parallelly in a node",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the node containing the text nodes to replace")
                    }
                    putJsonObject("text") {
                        put("type", "array")
                        put("description", "Array of text node IDs and their replacement texts")
                        putJsonObject("items") {
                            put("type", "object")
                            putJsonObject("properties") {
                                putJsonObject("nodeId") {
                                    put("type", "string")
                                    put("description", "The ID of the text node")
                                }
                                putJsonObject("text") {
                                    put("type", "string")
                                    put("description", "The replacement text")
                                }
                            }
                            put("required", JsonArray(listOf(JsonPrimitive("nodeId"), JsonPrimitive("text"))))
                        }
                    }
                },
                required = listOf("nodeId", "text")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    
                    // Debug log: Print all arguments to understand the structure
                    logger.info { "🔍 set_multiple_text_contents arguments: ${request.arguments}" }
                    logger.info { "🔍 text parameter type: ${request.arguments["text"]?.javaClass?.simpleName}" }
                    logger.info { "🔍 text parameter content: ${request.arguments["text"]}" }
                    
                    // Enhanced parsing logic to handle various input formats
                    val textReplacements = parseTextReplacements(request.arguments["text"])
                    
                    if (textReplacements.isEmpty()) {
                        return@runBlocking createSuccessResponse("No text items provided")
                    }
                    
                    logger.info { "✅ Parsed ${textReplacements.size} text replacements successfully" }
                    
                    // Build JsonArray of replacements so it is sent as a real array, not a string
                    val textJsonArray = JsonArray(
                        textReplacements.map { replacement ->
                            buildJsonObject {
                                put("nodeId", replacement["nodeId"] as String)
                                put("text", replacement["text"] as String)
                            }
                        }
                    )
                    
                    val params = mapOf(
                        "nodeId" to nodeId,
                        // Pass JsonArray directly so transport serializes it as an array
                        "text" to textJsonArray as JsonElement
                    )
                    
                    // Debug: Log the actual data being sent to Figma
                    logger.info { "📤 Sending to Figma - nodeId: $nodeId" }
                    logger.info { "📤 Sending to Figma - text JSON array: $textJsonArray" }
                    logger.info { "📤 Full params: $params" }
                    
                    val result = figmaCommandSender("set_multiple_text_contents", params)
                    
                    // Use progress-aware response processing
                    processTextReplaceResult(result, textReplacements.size, "Text replacement")
                } catch (e: Exception) {
                    logger.error { "❌ Error in set_multiple_text_contents: ${e.message}" }
                    createErrorResponse("setting multiple text contents", e)
                }
            }
        }
    }
    
    /**
     * Parse text replacements from various input formats
     */
    private fun parseTextReplacements(textParam: JsonElement?): List<Map<String, Any>> {
        return when (textParam) {
            is JsonArray -> {
                logger.info { "📋 Parsing JsonArray with ${textParam.size} items" }
                textParam.mapIndexed { index, textItem ->
                    try {
                        when (textItem) {
                            is JsonObject -> {
                                val nodeId = textItem["nodeId"]?.jsonPrimitive?.content
                                    ?: throw IllegalArgumentException("nodeId is required in text item $index")
                                val text = textItem["text"]?.jsonPrimitive?.content
                                    ?: throw IllegalArgumentException("text is required in text item $index")
                                
                                logger.debug { "✅ Parsed item $index: nodeId=$nodeId, text=$text" }
                                
                                // Create explicit Map structure that matches TypeScript interface
                                mapOf(
                                    "nodeId" to nodeId as Any,
                                    "text" to text as Any
                                )
                            }
                            else -> throw IllegalArgumentException("Expected object at index $index, got ${textItem::class.simpleName}")
                        }
                    } catch (e: Exception) {
                        logger.error { "❌ Failed to parse text item $index: ${e.message}" }
                        throw e
                    }
                }
            }
            is JsonPrimitive -> {
                logger.info { "🔤 Parsing JsonPrimitive string as JSON array" }
                try {
                    val jsonString = textParam.content
                    val parsedArray = Json.parseToJsonElement(jsonString).jsonArray
                    parseTextReplacements(parsedArray) // Recursive call with parsed array
                } catch (e: Exception) {
                    logger.error { "❌ Failed to parse string as JSON: ${textParam.content}" }
                    throw IllegalArgumentException("Invalid text array format. Expected JSON array, got: ${textParam.content}", e)
                }
            }
            is JsonObject -> {
                // Handle case where single object is passed instead of array
                logger.info { "📝 Converting single JsonObject to array" }
                listOf(parseTextReplacements(JsonArray(listOf(textParam)))[0])
            }
            null -> {
                logger.error { "❌ text parameter is null" }
                throw IllegalArgumentException("text parameter is required")
            }
            else -> {
                logger.error { "❌ Unsupported text parameter type: ${textParam::class.simpleName}" }
                throw IllegalArgumentException("text parameter must be a JSON array, object, or string representation of an array. Got: ${textParam::class.simpleName}")
            }
        }
    }
} 
