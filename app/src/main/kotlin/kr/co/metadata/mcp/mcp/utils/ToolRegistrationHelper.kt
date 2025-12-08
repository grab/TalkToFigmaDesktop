package kr.co.metadata.mcp.mcp.utils

import io.modelcontextprotocol.kotlin.sdk.*
import io.modelcontextprotocol.kotlin.sdk.server.Server
import kotlinx.serialization.json.*
import mu.KotlinLogging

/**
 * Helper utilities for tool registration to reduce boilerplate code
 */
object ToolRegistrationHelper {

    private val logger = KotlinLogging.logger {}

    /**
     * Register a simple tool with automatic error handling
     * Reduces boilerplate by wrapping common patterns
     */
    fun registerSimpleTool(
        server: Server,
        name: String,
        description: String,
        inputSchema: Tool.Input,
        handler: suspend (CallToolRequest) -> CallToolResult
    ) {
        server.addTool(
            name = name,
            description = description,
            inputSchema = inputSchema
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    handler(request)
                } catch (e: Exception) {
                    logger.error(e) { "Error executing tool '$name'" }
                    CallToolResult(
                        content = listOf(TextContent("Error executing $name: ${e.message}"))
                    )
                }
            }
        }
    }

    /**
     * Register a Figma command tool - for simple pass-through tools
     * Extracts parameters, calls Figma command, returns response
     */
    fun registerFigmaCommandTool(
        server: Server,
        name: String,
        description: String,
        inputSchema: Tool.Input,
        figmaCommandSender: suspend (String, Map<String, Any>) -> Any,
        paramExtractor: (JsonObject) -> Map<String, Any>,
        successMessage: (Any) -> String = { "Operation completed: $it" }
    ) {
        registerSimpleTool(server, name, description, inputSchema) { request ->
            val params = paramExtractor(request.arguments)
            val result = figmaCommandSender(name, params)
            CallToolResult(
                content = listOf(TextContent(successMessage(result)))
            )
        }
    }

    /**
     * Create a standardized success response
     */
    fun createSuccessResponse(message: String): CallToolResult {
        return CallToolResult(
            content = listOf(TextContent(message))
        )
    }

    /**
     * Create a standardized error response
     */
    fun createErrorResponse(operation: String, error: Throwable): CallToolResult {
        val errorMessage = "Error $operation: ${error.message}"
        logger.error(error) { errorMessage }
        return CallToolResult(
            content = listOf(TextContent(errorMessage))
        )
    }
}
