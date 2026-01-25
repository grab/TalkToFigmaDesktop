/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.mcp

import kr.co.metadata.mcp.mcp.validation.ValidationResult
import kr.co.metadata.mcp.mcp.validation.Validator
import kr.co.metadata.mcp.mcp.validation.validate
import io.modelcontextprotocol.kotlin.sdk.*
import io.modelcontextprotocol.kotlin.sdk.server.Server
import kotlinx.coroutines.delay
import kotlinx.serialization.json.*
import mu.KotlinLogging
import kr.co.metadata.mcp.server.AnnotationResult
import kr.co.metadata.mcp.server.TextReplaceResult
import kr.co.metadata.mcp.server.ScanResult
import kr.co.metadata.mcp.server.OperationResult
import kr.co.metadata.mcp.analytics.GoogleAnalyticsService

/**
 * Base service class for all Figma MCP services
 * Provides common functionality including validation, error handling, and progress tracking
 */
abstract class BaseFigmaService {
    
    protected val logger = KotlinLogging.logger {}
    
    // Static reference to analytics service - will be injected from App
    companion object {
        var analyticsService: GoogleAnalyticsService? = null
    }

    /**
     * Validate request parameters using our custom validation system
     * Returns validation result that can be used to handle success/error cases
     */
    protected inline fun <reified T> validateRequest(
        request: CallToolRequest,
        noinline validator: Validator<T>
    ): ValidationResult<T> {
        return try {
            val data = Json.decodeFromJsonElement<T>(request.arguments)
            validate(data, validator)
        } catch (e: Exception) {
            ValidationResult.Error(listOf("Failed to parse request parameters: ${e.message}"))
        }
    }

    /**
     * Create a validated tool handler that automatically validates input parameters
     */
    protected inline fun <reified T> createValidatedHandler(
        noinline validator: Validator<T>,
        crossinline handler: suspend (T, suspend (String, Map<String, Any>) -> Any) -> CallToolResult
    ): suspend (CallToolRequest, suspend (String, Map<String, Any>) -> Any) -> CallToolResult {
        return { request, figmaCommandSender ->
            when (val validationResult = validateRequest(request, validator)) {
                is ValidationResult.Success -> {
                    handler(validationResult.value, figmaCommandSender)
                }
                is ValidationResult.Error -> {
                    createErrorResponse("validation", ValidationException(validationResult.errors))
                }
            }
        }
    }

    /**
     * Custom exception for validation errors
     */
    class ValidationException(val errors: List<String>) : Exception("Validation failed: ${errors.joinToString(", ")}")
    
    /**
     * Create a standardized tool response for successful operations
     */
    protected fun createSuccessResponse(message: String): CallToolResult {
        return CallToolResult(
            content = listOf(TextContent(message))
        )
    }
    
    /**
     * Create a standardized tool response for errors
     */
    protected fun createErrorResponse(operation: String, error: Throwable): CallToolResult {
        val errorMessage = "Error $operation: ${error.message}"
        logger.error(error) { errorMessage }
        return CallToolResult(
            content = listOf(TextContent(errorMessage))
        )
    }
    
    /**
     * Create a multi-content response with initial status and results
     * Used for progress-aware operations
     */
    protected fun createProgressResponse(
        initialMessage: String,
        result: Any,
        successMessage: String? = null
    ): CallToolResult {
        val content = mutableListOf<TextContent>()
        
        // Add initial status message
        content.add(TextContent(initialMessage))
        
        // Add success message if provided
        if (successMessage != null) {
            content.add(TextContent(successMessage))
        }
        
        // Add result data
        content.add(TextContent(result.toString()))
        
        return CallToolResult(content = content)
    }
    
    /**
     * Create initial status message for long-running operations
     */
    protected fun createInitialProgressMessage(
        operationType: String,
        itemCount: Int,
        batchSize: Int = 5
    ): String {
        return "Starting $operationType for $itemCount items. This will be processed in batches of $batchSize..."
    }
    
    /**
     * Create progress summary message from operation result
     */
    protected fun createProgressSummary(
        operationType: String,
        applied: Int,
        failed: Int,
        total: Int,
        chunks: Int,
        elapsedTime: Long? = null
    ): String {
        val timeInfo = if (elapsedTime != null) " (${elapsedTime}ms)" else ""
        return """
        |$operationType completed$timeInfo:
        |- $applied of $total successfully processed
        |- $failed failed
        |- Processed in $chunks batches
        """.trimMargin()
    }
    
    /**
     * Create detailed failure report
     */
    protected fun createFailureReport(failedResults: List<OperationResult>): String {
        if (failedResults.isEmpty()) return ""
        
        return "\n\nItems that failed:\n" + failedResults.joinToString("\n") { result ->
            "- ${result.nodeId}: ${result.error ?: "Unknown error"}"
        }
    }
    
    /**
     * Process annotation result and create appropriate response
     */
    protected fun processAnnotationResult(
        result: Any,
        totalToProcess: Int,
        operationType: String = "Annotation process"
    ): CallToolResult {
        return try {
            // Try to parse as AnnotationResult
            if (result is AnnotationResult) {
                val initialMessage = createInitialProgressMessage(operationType, totalToProcess)
                val progressSummary = createProgressSummary(
                    operationType,
                    result.annotationsApplied,
                    result.annotationsFailed,
                    totalToProcess,
                    result.completedInChunks
                )
                val failureReport = createFailureReport(result.results.filter { !it.success })
                
                return createProgressResponse(
                    initialMessage,
                    result,
                    progressSummary + failureReport
                )
            }
            
            // Fallback to simple success response
            createSuccessResponse("$operationType completed: $result")
        } catch (e: Exception) {
            logger.warn(e) { "Failed to parse result as AnnotationResult, using simple response" }
            createSuccessResponse("$operationType completed: $result")
        }
    }
    
    /**
     * Process text replacement result and create appropriate response
     */
    protected fun processTextReplaceResult(
        result: Any,
        totalToProcess: Int,
        operationType: String = "Text replacement"
    ): CallToolResult {
        return try {
            if (result is TextReplaceResult) {
                val initialMessage = createInitialProgressMessage(operationType, totalToProcess)
                val progressSummary = createProgressSummary(
                    operationType,
                    result.replacementsApplied,
                    result.replacementsFailed,
                    totalToProcess,
                    result.completedInChunks
                )
                val failureReport = createFailureReport(result.results.filter { !it.success })
                
                return createProgressResponse(
                    initialMessage,
                    result,
                    progressSummary + failureReport
                )
            }
            
            createSuccessResponse("$operationType completed: $result")
        } catch (e: Exception) {
            logger.warn(e) { "Failed to parse result as TextReplaceResult, using simple response" }
            createSuccessResponse("$operationType completed: $result")
        }
    }
    
    /**
     * Process scan result and create appropriate response
     */
    protected fun processScanResult(
        result: Any,
        operationType: String = "Node scanning"
    ): CallToolResult {
        return try {
            if (result is ScanResult) {
                val initialMessage = "Starting $operationType. This may take a moment for large designs..."
                val summaryMessage = """
                |Scan completed:
                |- Found ${result.totalNodes} nodes
                |- Processed in ${result.chunks} chunks
                """.trimMargin()
                
                return createProgressResponse(
                    initialMessage,
                    if (result.textNodes.isNotEmpty()) result.textNodes else result.matchingNodes,
                    summaryMessage
                )
            }
            
            createSuccessResponse("$operationType completed: $result")
        } catch (e: Exception) {
            logger.warn(e) { "Failed to parse result as ScanResult, using simple response" }
            createSuccessResponse("$operationType completed: $result")
        }
    }
    
    /**
     * Execute a Figma command with proper error handling and analytics tracking
     */
    protected suspend fun executeFigmaCommand(
        command: String,
        params: Map<String, Any>,
        figmaCommandSender: suspend (String, Map<String, Any>) -> Any,
        operation: String
    ): CallToolResult {
        val startTime = System.currentTimeMillis()
        
        return try {
            val result = figmaCommandSender(command, params)
            val duration = System.currentTimeMillis() - startTime
            
            // Track successful tool call
            analyticsService?.sendMcpToolCall(
                toolName = command,
                success = true,
                duration = duration,
                resultType = "success"
            )
            
            // Handle different result types properly
            val responseText = when (result) {
                is JsonElement -> {
                    // If result is already a JsonElement, convert to pretty JSON string
                    kotlinx.serialization.json.Json { prettyPrint = true }.encodeToString(JsonElement.serializer(), result)
                }
                is String -> {
                    // If result is a string, check if it's valid JSON
                    try {
                        val jsonElement = kotlinx.serialization.json.Json.parseToJsonElement(result)
                        kotlinx.serialization.json.Json { prettyPrint = true }.encodeToString(JsonElement.serializer(), jsonElement)
                    } catch (e: Exception) {
                        // If not valid JSON, return as is
                        result
                    }
                }
                else -> {
                    // For other types, convert to string but try to preserve structure
                    result.toString()
                }
            }
            
            createSuccessResponse(responseText)
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            
            // Track failed tool call
            analyticsService?.sendMcpToolCall(
                toolName = command,
                success = false,
                duration = duration,
                errorMessage = e.message ?: "Unknown error",
                resultType = "execution_error"
            )
            
            createErrorResponse(operation, e)
        }
    }
    
    /**
     * Extract double value from JsonElement safely
     */
    protected fun JsonElement?.safeDouble(fieldName: String): Double {
        return this?.jsonPrimitive?.double ?: throw IllegalArgumentException("$fieldName is required")
    }
    
    /**
     * Extract optional double value from JsonElement
     */
    protected fun JsonElement?.safeDoubleOrDefault(default: Double): Double {
        return this?.jsonPrimitive?.double ?: default
    }
    
    /**
     * Extract string value from JsonElement safely
     */
    protected fun JsonElement?.safeString(fieldName: String): String {
        return this?.jsonPrimitive?.content ?: throw IllegalArgumentException("$fieldName is required")
    }
    
    /**
     * Extract optional string value from JsonElement
     */
    protected fun JsonElement?.safeStringOrDefault(default: String): String {
        return this?.jsonPrimitive?.content ?: default
    }
    
    /**
     * Extract boolean value from JsonElement safely
     */
    protected fun JsonElement?.safeBooleanOrDefault(default: Boolean): Boolean {
        return this?.jsonPrimitive?.boolean ?: default
    }
    
    /**
     * Build JSON object for tool parameters
     */
    protected fun buildToolInput(vararg properties: Pair<String, JsonObject>): Tool.Input {
        return Tool.Input(
            properties = buildJsonObject {
                properties.forEach { (name, props) ->
                    put(name, props)
                }
            },
            required = properties.filter { it.second.containsKey("required") && it.second["required"]?.jsonPrimitive?.boolean == true }
                .map { it.first }
        )
    }
    
    /**
     * Build a standard property definition for tool schemas
     */
    protected fun buildProperty(
        type: String,
        description: String,
        required: Boolean = false,
        default: JsonElement? = null
    ): JsonObject {
        return buildJsonObject {
            put("type", type)
            put("description", description)
            if (required) put("required", true)
            if (default != null) put("default", default)
        }
    }
} 
