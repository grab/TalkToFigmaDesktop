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
 * Service for managing Figma annotations
 * Provides tools for getting, setting, and managing annotations in Figma documents
 */
object AnnotationService : BaseFigmaService() {

    /**
     * Register all annotation-related tools
     */
    fun registerTools(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        // Register all annotation tools
        registerGetAnnotations(server, figmaCommandSender)
        registerSetAnnotation(server, figmaCommandSender)
        registerSetMultipleAnnotations(server, figmaCommandSender)
        registerScanNodesByTypes(server, figmaCommandSender)
        
        logger.info { "Annotation service tools registered successfully" }
    }

    /**
     * Get all annotations in the current document or specific node
     */
    private fun registerGetAnnotations(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "get_annotations",
            description = "Get all annotations in the current document or specific node",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "Optional node ID to get annotations for specific node")
                    }
                    putJsonObject("includeCategories") {
                        put("type", "boolean")
                        put("description", "Whether to include category information")
                        put("default", true)
                    }
                }
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"]?.jsonPrimitive?.content
                    val includeCategories = request.arguments["includeCategories"].safeBooleanOrDefault(true)
                    
                    val params = buildMap<String, Any> {
                        if (nodeId != null) put("nodeId", nodeId)
                        put("includeCategories", includeCategories as Any)
                    }
                    
                    val result = figmaCommandSender("get_annotations", params)
                    createSuccessResponse("Retrieved annotations successfully: $result")
                } catch (e: Exception) {
                    createErrorResponse("getting annotations", e)
                }
            }
        }
    }

    /**
     * Create or update an annotation with markdown support
     */
    private fun registerSetAnnotation(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_annotation",
            description = "Create or update an annotation with markdown support",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the node to annotate")
                    }
                    putJsonObject("annotationId") {
                        put("type", "string")
                        put("description", "The ID of the annotation to update (if updating existing annotation)")
                    }
                    putJsonObject("labelMarkdown") {
                        put("type", "string")
                        put("description", "The annotation text in markdown format")
                    }
                    putJsonObject("categoryId") {
                        put("type", "string")
                        put("description", "The ID of the annotation category")
                    }
                    putJsonObject("properties") {
                        put("type", "array")
                        put("description", "Additional properties for the annotation")
                        putJsonObject("items") {
                            put("type", "object")
                            putJsonObject("properties") {
                                putJsonObject("type") {
                                    put("type", "string")
                                }
                            }
                        }
                    }
                },
                required = listOf("nodeId", "labelMarkdown")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    val labelMarkdown = request.arguments["labelMarkdown"].safeString("labelMarkdown")
                    val annotationId = request.arguments["annotationId"]?.jsonPrimitive?.content
                    val categoryId = request.arguments["categoryId"]?.jsonPrimitive?.content
                    val properties = request.arguments["properties"]?.jsonArray
                    
                    val params = buildMap<String, Any> {
                        put("nodeId", nodeId)
                        put("labelMarkdown", labelMarkdown)
                        if (annotationId != null) put("annotationId", annotationId)
                        if (categoryId != null) put("categoryId", categoryId)
                        if (properties != null) {
                            val propsList = properties.map { propItem ->
                                val propObj = propItem.jsonObject
                                mapOf("type" to (propObj["type"]?.jsonPrimitive?.content ?: ""))
                            }
                            put("properties", propsList)
                        }
                    }
                    
                    val result = figmaCommandSender("set_annotation", params)
                    createSuccessResponse("Set annotation successfully: $result")
                } catch (e: Exception) {
                    createErrorResponse("setting annotation", e)
                }
            }
        }
    }

    /**
     * Batch create/update multiple annotations efficiently
     */
    private fun registerSetMultipleAnnotations(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_multiple_annotations", 
            description = "Batch create/update multiple annotations efficiently",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the node containing the elements to annotate")
                    }
                    putJsonObject("annotations") {
                        put("type", "array")
                        put("description", "Array of annotations to apply")
                        putJsonObject("items") {
                            put("type", "object")
                            putJsonObject("properties") {
                                putJsonObject("nodeId") {
                                    put("type", "string")
                                    put("description", "The ID of the node to annotate")
                                }
                                putJsonObject("labelMarkdown") {
                                    put("type", "string")
                                    put("description", "The annotation text in markdown format")
                                }
                                putJsonObject("categoryId") {
                                    put("type", "string")
                                    put("description", "The ID of the annotation category")
                                }
                                putJsonObject("annotationId") {
                                    put("type", "string")
                                    put("description", "The ID of the annotation to update (if updating existing annotation)")
                                }
                                putJsonObject("properties") {
                                    put("type", "array")
                                    put("description", "Additional properties for the annotation")
                                    putJsonObject("items") {
                                        put("type", "object")
                                        putJsonObject("properties") {
                                            putJsonObject("type") {
                                                put("type", "string")
                                            }
                                        }
                                    }
                                }
                            }
                            put("required", JsonArray(listOf(JsonPrimitive("nodeId"), JsonPrimitive("labelMarkdown"))))
                        }
                    }
                },
                required = listOf("nodeId", "annotations")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    
                    // Debug log: Print all arguments to understand the structure
                    logger.info { "🔍 set_multiple_annotations arguments: ${request.arguments}" }
                    logger.info { "🔍 annotations parameter type: ${request.arguments["annotations"]?.javaClass?.simpleName}" }
                    logger.info { "🔍 annotations parameter content: ${request.arguments["annotations"]}" }
                    
                    // Enhanced parsing logic to handle various input formats
                    val annotationsList = parseAnnotations(request.arguments["annotations"])
                    
                    if (annotationsList.isEmpty()) {
                        return@runBlocking createSuccessResponse("No annotations provided")
                    }
                    
                    logger.info { "✅ Parsed ${annotationsList.size} annotations successfully" }
                    
                    // Build JsonArray so it is sent as a real array, not a string
                    val annotationsJsonArray = JsonArray(
                        annotationsList.map { annotation ->
                            buildJsonObject {
                                put("nodeId", annotation["nodeId"] as String)
                                put("labelMarkdown", annotation["labelMarkdown"] as String)
                                annotation["categoryId"]?.let { put("categoryId", it as String) }
                                annotation["annotationId"]?.let { put("annotationId", it as String) }
                                annotation["properties"]?.let { props ->
                                    put("properties", JsonArray((props as List<*>).map { prop ->
                                        buildJsonObject {
                                            put("type", (prop as Map<*, *>)["type"] as String)
                                        }
                                    }))
                                }
                            }
                        }
                    )

                    val params = mapOf(
                        "nodeId" to nodeId,
                        // Pass JsonArray directly so transport serializes it as an array
                        "annotations" to annotationsJsonArray as JsonElement
                    )
                    
                    val result = figmaCommandSender("set_multiple_annotations", params)
                    
                    // Use progress-aware response processing
                    processAnnotationResult(result, annotationsList.size, "Annotation process")
                } catch (e: Exception) {
                    logger.error { "❌ Error in set_multiple_annotations: ${e.message}" }
                    createErrorResponse("setting multiple annotations", e)
                }
            }
        }
    }
    
    /**
     * Parse annotations from various input formats
     */
    private fun parseAnnotations(annotationsParam: JsonElement?): List<Map<String, Any>> {
        return when (annotationsParam) {
            is JsonArray -> {
                logger.info { "📋 Parsing JsonArray with ${annotationsParam.size} annotation items" }
                annotationsParam.mapIndexed { index, annotationItem ->
                    try {
                        when (annotationItem) {
                            is JsonObject -> {
                                val nodeId = annotationItem["nodeId"]?.jsonPrimitive?.content
                                    ?: throw IllegalArgumentException("nodeId is required in annotation item $index")
                                val labelMarkdown = annotationItem["labelMarkdown"]?.jsonPrimitive?.content
                                    ?: throw IllegalArgumentException("labelMarkdown is required in annotation item $index")
                                
                                val annotation = buildMap<String, Any> {
                                    put("nodeId", nodeId)
                                    put("labelMarkdown", labelMarkdown)
                                    
                                    annotationItem["categoryId"]?.jsonPrimitive?.content?.let { put("categoryId", it) }
                                    annotationItem["annotationId"]?.jsonPrimitive?.content?.let { put("annotationId", it) }
                                    annotationItem["properties"]?.jsonArray?.let { propsArray ->
                                        val propsList = propsArray.map { propItem ->
                                            val propObj = propItem.jsonObject
                                            mapOf("type" to (propObj["type"]?.jsonPrimitive?.content ?: ""))
                                        }
                                        put("properties", propsList)
                                    }
                                }
                                
                                logger.debug { "✅ Parsed annotation $index: nodeId=$nodeId, labelMarkdown=$labelMarkdown" }
                                annotation
                            }
                            else -> throw IllegalArgumentException("Expected object at index $index, got ${annotationItem::class.simpleName}")
                        }
                    } catch (e: Exception) {
                        logger.error { "❌ Failed to parse annotation item $index: ${e.message}" }
                        throw e
                    }
                }
            }
            is JsonPrimitive -> {
                logger.info { "🔤 Parsing JsonPrimitive string as JSON array" }
                try {
                    val jsonString = annotationsParam.content
                    val parsedArray = Json.parseToJsonElement(jsonString).jsonArray
                    parseAnnotations(parsedArray) // Recursive call with parsed array
                } catch (e: Exception) {
                    logger.error { "❌ Failed to parse string as JSON: ${annotationsParam.content}" }
                    throw IllegalArgumentException("Invalid annotations array format. Expected JSON array, got: ${annotationsParam.content}", e)
                }
            }
            is JsonObject -> {
                // Handle case where single object is passed instead of array
                logger.info { "📝 Converting single JsonObject to array" }
                listOf(parseAnnotations(JsonArray(listOf(annotationsParam)))[0])
            }
            null -> {
                logger.error { "❌ annotations parameter is null" }
                throw IllegalArgumentException("annotations parameter is required")
            }
            else -> {
                logger.error { "❌ Unsupported annotations parameter type: ${annotationsParam::class.simpleName}" }
                throw IllegalArgumentException("annotations parameter must be a JSON array, object, or string representation of an array. Got: ${annotationsParam::class.simpleName}")
            }
        }
    }

    /**
     * Scan for nodes with specific types (useful for finding annotation targets)
     */
    private fun registerScanNodesByTypes(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "scan_nodes_by_types",
            description = "Scan for nodes with specific types (useful for finding annotation targets)",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "ID of the node to scan")
                    }
                    putJsonObject("types") {
                        put("type", "array")
                        put("description", "Array of node types to find in the child nodes (e.g. ['COMPONENT', 'FRAME'])")
                        putJsonObject("items") {
                            put("type", "string")
                        }
                    }
                },
                required = listOf("nodeId", "types")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"].safeString("nodeId")
                    val types = request.arguments["types"]?.jsonArray
                        ?: throw IllegalArgumentException("types array is required")
                    
                    val params = mapOf(
                        "nodeId" to nodeId,
                        "types" to types.map { it.jsonPrimitive.content }
                    )
                    
                    val result = figmaCommandSender("scan_nodes_by_types", params)
                    
                    // Use progress-aware response processing for scanning
                    processScanResult(result, "Node type scanning for types: ${types.joinToString(", ") { it.jsonPrimitive.content }}")
                } catch (e: Exception) {
                    createErrorResponse("scanning nodes by types", e)
                }
            }
        }
    }
} 
