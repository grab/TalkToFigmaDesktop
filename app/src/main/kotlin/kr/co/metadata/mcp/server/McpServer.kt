/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.server

import io.modelcontextprotocol.kotlin.sdk.*
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.server.ServerOptions
import io.modelcontextprotocol.kotlin.sdk.server.mcp
import io.ktor.server.engine.*
import io.ktor.server.cio.*
import io.ktor.server.application.*
import io.ktor.server.sse.*
import kotlinx.coroutines.*
import kotlinx.serialization.json.*
import kotlinx.serialization.Serializable
import mu.KotlinLogging
import java.net.URI
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.util.concurrent.ConcurrentHashMap
import java.util.UUID

/**
 * Progress-related data classes for Figma MCP operations
 * Ported from TypeScript server.ts progress functionality
 */

/**
 * Represents a command progress update from Figma plugin
 */
@Serializable
data class CommandProgressUpdate(
    val commandType: String,
    val progress: Int,
    val message: String,
    val status: String,
    val payload: JsonElement? = null
)

/**
 * Wrapper for WebSocket progress messages
 */
@Serializable
data class ProgressMessage(
    val type: String,
    val id: String? = null,
    val message: ProgressMessageData
)

/**
 * Data part of progress message
 */
@Serializable
data class ProgressMessageData(
    val data: CommandProgressUpdate
)

/**
 * Result structure for annotation operations
 */
@Serializable
data class AnnotationResult(
    val success: Boolean,
    val annotationsApplied: Int = 0,
    val annotationsFailed: Int = 0,
    val completedInChunks: Int = 1,
    val results: List<OperationResult> = emptyList()
)

/**
 * Result structure for text replacement operations
 */
@Serializable
data class TextReplaceResult(
    val success: Boolean,
    val replacementsApplied: Int = 0,
    val replacementsFailed: Int = 0,
    val completedInChunks: Int = 1,
    val results: List<OperationResult> = emptyList()
)

/**
 * Result structure for scanning operations
 */
@Serializable
data class ScanResult(
    val success: Boolean,
    val totalNodes: Int = 0,
    val processedNodes: Int = 0,
    val chunks: Int = 1,
    val textNodes: List<JsonElement> = emptyList(),
    val matchingNodes: List<JsonElement> = emptyList()
)

/**
 * Individual operation result
 */
@Serializable
data class OperationResult(
    val nodeId: String,
    val success: Boolean,
    val error: String? = null
)

/**
 * Progress status for long-running operations
 */
data class ProgressStatus(
    val isStarted: Boolean = false,
    val currentStep: Int = 0,
    val totalSteps: Int = 0,
    val message: String = "",
    val startTime: Long = System.currentTimeMillis()
) {
    val progressPercentage: Int
        get() = if (totalSteps > 0) (currentStep * 100) / totalSteps else 0
        
    val elapsedTimeMs: Long
        get() = System.currentTimeMillis() - startTime
}

/**
 * MCP Server that provides Figma integration tools
 * Based on official MCP Kotlin SDK sample with Figma WebSocket client integration
 */
class McpServer {
    private val logger = KotlinLogging.logger {}
    
    // Server instances
    private var server: Server? = null
    private var serverJob: Job? = null
    
    // WebSocket client for communicating with Figma
    private var webSocketClient: WebSocketClient? = null
    private var currentChannel: String? = null
    private val pendingRequests = ConcurrentHashMap<String, CompletableDeferred<Any>>()
    private var isConnected: Boolean = false
    
    // Error handling
    private var onConnectionError: (() -> Unit)? = null
    
    // Server settings
    private val websocketPort = 3055
    private val wsUrl = "ws://localhost:$websocketPort"
    private val mcpPort = 3056
    
    // Coroutine scope for managing async operations
    private val coroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    /**
     * Set callback for connection errors
     */
    fun setConnectionErrorCallback(callback: () -> Unit) {
        onConnectionError = callback
    }
    
    /**
     * Get application version from version.properties file generated at build time
     */
    private fun getAppVersion(): String {
        return try {
            val properties = java.util.Properties()
            val inputStream = this::class.java.classLoader.getResourceAsStream("version.properties")
            inputStream?.use { properties.load(it) }
            properties.getProperty("version", "1.0.0") // fallback to default if not found
        } catch (e: Exception) {
            logger.warn { "Could not read version from properties file: ${e.message}" }
            "1.0.0" // fallback version
        }
    }
    
    fun start() {
        logger.info { "Starting MCP server..." }
        
        // Create MCP server instance
        server = Server(
            Implementation(
                name = "TalkToFigmaDesktop",
                version = getAppVersion()
            ),
            ServerOptions(
                capabilities = ServerCapabilities(
                    tools = ServerCapabilities.Tools(listChanged = true),
                    resources = ServerCapabilities.Resources(subscribe = true, listChanged = true),
                    prompts = ServerCapabilities.Prompts(listChanged = true)
                )
            )
        )

        
        // Configure MCP server with Figma tools
        configureMcpServer()
        
        // Initialize WebSocket client connection
        try {
            connectToFigma()
        } catch (e: Exception) {
            logger.warn { "Could not connect to Figma initially: ${e.message}" }
            logger.warn { "Will try to connect when the first command is sent" }
        }
        
        // Start MCP server with SSE transport (following official SDK sample pattern)
        logger.info { "Starting MCP server on http://localhost:$mcpPort/sse" }
        logger.info { "MCP protocol version: 2024-11-05" }
        logger.info { "Server capabilities: tools, resources, prompts" }
        logger.warn { "Note: Protocol version mismatch warnings are expected with Cursor (requires 2025-06-18)" }
        logger.warn { "These warnings do not affect functionality - the server will work correctly" }
        
        serverJob = coroutineScope.launch {
            try {
                embeddedServer(CIO, host = "127.0.0.1", port = mcpPort) {
                    mcp { server!! }
                }.start(wait = true)
            } catch (e: Exception) {
                logger.error { "Failed to start MCP server: ${e.message}" }
                logger.error { "Error details: ${e}" }
                throw e
            }
        }
        
        logger.info { "MCP server started successfully" }
    }
    
    fun stop() {
        logger.info { "Stopping MCP server..." }
        
        // Close WebSocket connection
        webSocketClient?.close()
        webSocketClient = null
        
        // Server will be stopped when the job is cancelled
        
        // Cancel coroutine scope
        coroutineScope.coroutineContext[Job]?.cancel()
        
        serverJob?.cancel()
        server = null
        serverJob = null
        currentChannel = null
        isConnected = false
        
        // Cancel all pending requests
        pendingRequests.values.forEach { it.cancel() }
        pendingRequests.clear()
        
        logger.info { "MCP server stopped" }
    }
    
    /**
     * Connect to Figma WebSocket server
     */
    private fun connectToFigma() {
        if (webSocketClient?.isOpen == true) {
            logger.info { "Already connected to Figma" }
            return
        }
        
        logger.info { "Connecting to Figma socket server at $wsUrl..." }
        
        webSocketClient = object : WebSocketClient(URI(wsUrl)) {
            override fun onOpen(handshake: ServerHandshake?) {
                logger.info { "Connected to Figma socket server" }
                currentChannel = null
                isConnected = true
            }
            
            override fun onMessage(message: String?) {
                message?.let { handleWebSocketMessage(it) }
            }
            
            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                logger.info { "Disconnected from Figma socket server" }
                isConnected = false
                currentChannel = null
                
                // Reject all pending requests
                pendingRequests.values.forEach { it.completeExceptionally(Exception("Connection closed")) }
                pendingRequests.clear()
                
                // Attempt to reconnect
                logger.info { "Attempting to reconnect in 2 seconds..." }
                coroutineScope.launch {
                    delay(2000)
                    connectToFigma()
                }
            }
            
            override fun onError(ex: Exception?) {
                logger.error { "Socket error: ${ex?.message}" }
                
                // Check if this is a "Connection refused" error and trigger dialog
                val errorMessage = ex?.message ?: "Unknown error"
                if (errorMessage.contains("Connection refused", ignoreCase = true)) {
                    onConnectionError?.invoke()
                }
            }
        }
        
        webSocketClient?.connect()
    }
    
    /**
     * Handle incoming WebSocket messages
     */
    private fun handleWebSocketMessage(message: String) {
        try {
            logger.debug { "Received WebSocket message: $message" }
            
            val json = kotlinx.serialization.json.Json.parseToJsonElement(message)
            
            when {
                json is JsonObject -> {
                    // Handle progress updates
                    if (json["type"]?.jsonPrimitive?.content == "progress_update") {
                        handleProgressUpdate(json)
                        return
                    }
                    
                    // Handle system messages
                    if (json["type"]?.jsonPrimitive?.content == "system") {
                        val messageElement = json["message"]
                        
                        when {
                            // Message is a JsonObject (structured response)
                            messageElement is JsonObject -> {
                                val responseId = messageElement["id"]?.jsonPrimitive?.content
                                val result = messageElement["result"]
                                
                                if (responseId != null && pendingRequests.containsKey(responseId)) {
                                    val request = pendingRequests.remove(responseId)
                                    // Return the full result object or the entire messageElement if result is null
                                    request?.complete(result ?: messageElement)
                                    logger.info { "System message processed for request: $responseId" }
                                } else {
                                    logger.info { "System message received: $messageElement" }
                                }
                            }
                            // Message is a JsonPrimitive (simple string message)
                            messageElement?.jsonPrimitive != null -> {
                                val messageContent = messageElement.jsonPrimitive.content
                                logger.info { "System message received: $messageContent" }
                                
                                val responseId = json["id"]?.jsonPrimitive?.content
                                if (responseId != null && pendingRequests.containsKey(responseId)) {
                                    val request = pendingRequests.remove(responseId)
                                    request?.complete(messageContent)
                                }
                            }
                            else -> {
                                logger.info { "System message received: $messageElement" }
                            }
                        }
                        return
                    }
                    
                    // Handle wrapped responses
                    val myResponse = json["message"]?.jsonObject
                    if (myResponse != null) {
                        logger.debug { "Received wrapped message: $myResponse" }
                        
                        val responseId = myResponse["id"]?.jsonPrimitive?.content
                        logger.debug { "Extracted responseId: $responseId" }
                        logger.debug { "Pending requests keys: ${pendingRequests.keys}" }
                        
                        if (responseId != null && pendingRequests.containsKey(responseId)) {
                            logger.debug { "Found matching pending request for: $responseId" }
                            val request = pendingRequests.remove(responseId)
                            
                            val error = myResponse["error"]?.jsonPrimitive?.content
                            val result = myResponse["result"]
                            
                            logger.debug { "Error: $error" }
                            logger.debug { "Result type: ${result?.javaClass?.simpleName}" }
                            logger.debug { "Result content preview: ${result?.toString()?.take(200)}..." }
                            
                            if (error != null) {
                                logger.error { "Error from Figma: $error" }
                                request?.completeExceptionally(Exception(error))
                            } else {
                                // Check if this is a meaningful response or just a command confirmation
                                val isCommandConfirmation = result == null || 
                                    (result is JsonObject && result.size <= 3 && 
                                     result.containsKey("id") && result.containsKey("command"))
                                
                                if (isCommandConfirmation) {
                                    logger.debug { "Received command confirmation, waiting for actual data..." }
                                    // Put the request back and wait for the actual data response
                                    pendingRequests[responseId] = request!!
                                } else {
                                    logger.debug { "Completing request with result" }
                                    // Return the actual result object, not just its string representation
                                    request?.complete(result ?: myResponse)
                                }
                            }
                        } else {
                            logger.warn { "No matching pending request found for responseId: $responseId" }
                            logger.debug { "Available pending requests: ${pendingRequests.keys}" }
                        }
                        return
                    }
                    
                    // Handle direct responses (including the structure we saw in logs)
                    val responseId = json["id"]?.jsonPrimitive?.content
                    if (responseId != null && pendingRequests.containsKey(responseId)) {
                        logger.debug { "Found direct response for: $responseId" }
                        val request = pendingRequests.remove(responseId)
                        
                        val error = json["error"]?.jsonPrimitive?.content
                        val result = json["result"]
                        
                        logger.debug { "Direct response - Error: $error" }
                        logger.debug { "Direct response - Result type: ${result?.javaClass?.simpleName}" }
                        logger.debug { "Direct response - Result content preview: ${result?.toString()?.take(200)}..." }
                        
                        if (error != null) {
                            logger.error { "Error from Figma: $error" }
                            request?.completeExceptionally(Exception(error))
                        } else {
                            logger.debug { "Completing direct request with result" }
                            // Return the actual result object, not just its string representation
                            request?.complete(result ?: json)
                        }
                        return
                    }
                    
                    logger.debug { "Unhandled message: $json" }
                }
                else -> {
                    logger.debug { "Received non-object message: $json" }
                }
            }
        } catch (e: Exception) {
            logger.error { "Error parsing message: ${e.message}" }
            logger.debug { "Raw message: $message" }
        }
    }
    
    /**
     * Handle progress update messages from Figma plugin
     */
    private fun handleProgressUpdate(json: JsonObject) {
        try {
            val progressData = json["message"]?.jsonObject?.get("data")?.jsonObject
            val requestId = json["id"]?.jsonPrimitive?.content ?: ""

            if (progressData != null && requestId.isNotEmpty() && pendingRequests.containsKey(requestId)) {
                val request = pendingRequests[requestId]
                
                // Extract progress information
                val commandType = progressData["commandType"]?.jsonPrimitive?.content ?: ""
                val progress = progressData["progress"]?.jsonPrimitive?.int ?: 0
                val message = progressData["message"]?.jsonPrimitive?.content ?: ""
                val status = progressData["status"]?.jsonPrimitive?.content ?: ""

                // Log progress
                logger.info { "Progress update for $commandType: $progress% - $message" }

                // For completed updates, we could resolve the request early if desired
                if (status == "completed" && progress == 100) {
                    val payload = progressData["payload"]
                    if (payload != null) {
                        // Optionally resolve early with partial data
                        // request.complete(payload.toString())
                        // pendingRequests.remove(requestId)
                        
                        // Instead, just log the completion, wait for final result from Figma
                        logger.info { "Operation $commandType completed, waiting for final result" }
                    } else {
                        logger.info { "Operation $commandType completed, waiting for final result" }
                    }
                }
            }
        } catch (e: Exception) {
            logger.warn(e) { "Error processing progress update: ${e.message}" }
        }
    }

    /**
     * Send command to Figma WebSocket server
     */
    private suspend fun sendCommandToFigma(command: String, params: Map<String, Any> = emptyMap(), timeoutMs: Long = 30000): Any {
        if (!isConnected) {
            throw Exception("Not connected to Figma")
        }
        
        // Check if we need a channel for this command
        val requiresChannel = command != "join"
        if (requiresChannel && currentChannel == null) {
            throw Exception("Must join a channel before sending commands")
        }
        
        val commandId = UUID.randomUUID().toString()
        val deferred = CompletableDeferred<Any>()
        
        val request = buildJsonObject {
            put("id", commandId)
            put("type", if (command == "join") "join" else "message")
            if (command == "join") {
                @Suppress("UNCHECKED_CAST")
                val paramsMap = params as? Map<String, Any>
                put("channel", paramsMap?.get("channel")?.toString() ?: "")
            } else {
                put("channel", currentChannel)
            }
            putJsonObject("message") {
                put("id", commandId)
                put("command", command)
                // Convert params to JsonObject with proper JSON serialization
                putJsonObject("params") {
                    params.forEach { (key, value) ->
                        when (value) {
                            is String -> put(key, value)
                            is Number -> put(key, JsonPrimitive(value))
                            is Boolean -> put(key, value)
                            is Map<*, *> -> {
                                // Handle nested objects (like color)
                                @Suppress("UNCHECKED_CAST")
                                val map = value as Map<String, Any>
                                putJsonObject(key) {
                                    map.forEach { (nestedKey, nestedValue) ->
                                        when (nestedValue) {
                                            is String -> put(nestedKey, nestedValue)
                                            is Number -> put(nestedKey, JsonPrimitive(nestedValue))
                                            is Boolean -> put(nestedKey, nestedValue)
                                            else -> put(nestedKey, nestedValue.toString())
                                        }
                                    }
                                }
                            }
                            is List<*> -> {
                                // Handle arrays (like nodeIds) - ensure strings are not double-quoted
                                val jsonArray = JsonArray(value.mapNotNull { item ->
                                    when (item) {
                                        is String -> JsonPrimitive(item)
                                        is Number -> JsonPrimitive(item) 
                                        is Boolean -> JsonPrimitive(item)
                                        is JsonElement -> item
                                        null -> null
                                        else -> JsonPrimitive(item.toString())
                                    }
                                })
                                put(key, jsonArray)
                            }
                            else -> {
                                // Handle different value types explicitly for better JSON serialization
                                when (value) {
                                    is JsonElement -> put(key, value)
                                    is Int -> put(key, JsonPrimitive(value))
                                    is Long -> put(key, JsonPrimitive(value))
                                    is Float -> put(key, JsonPrimitive(value))
                                    is Double -> put(key, JsonPrimitive(value))
                                    else -> {
                                        // For string and other types, convert directly to JsonPrimitive
                                        val stringValue = value.toString()
                                        put(key, JsonPrimitive(stringValue))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Store the promise callbacks to resolve/reject later
        pendingRequests[commandId] = deferred
        
        // Send the request
        logger.info { "Sending command to Figma: $command" }
        logger.debug { "Request details: $request" }
        
        return try {
            webSocketClient?.send(request.toString())
            
            // Wait for response with timeout
            withTimeout(timeoutMs) {
                deferred.await()
            }
        } catch (e: Exception) {
            pendingRequests.remove(commandId)
            logger.error { "Command failed: $command - ${e.message}" }
            throw e
        }
    }
    
    /**
     * Join a channel for communication with Figma
     */
    private suspend fun joinChannel(channelName: String) {
        if (!isConnected) {
            connectToFigma()
            // Wait a bit for connection to establish
            delay(1000)
            if (!isConnected) {
                throw Exception("Not connected to Figma")
            }
        }
        
        try {
            logger.info { "Joining channel: $channelName" }
            sendCommandToFigma("join", mapOf("channel" to channelName.trim()))
            currentChannel = channelName
            logger.info { "Successfully joined channel: $channelName" }
        } catch (e: Exception) {
            logger.error { "Failed to join channel '$channelName': ${e.message}" }
            logger.debug { "Full error details: ${e}" }
            throw e
        }
    }
    
    /**
     * Configure MCP server with tools, resources, and prompts
     */
    private fun configureMcpServer() {
        val server = this.server ?: return
        
        logger.info { "Configuring MCP server with Figma tools..." }
        
        // Register join_channel tool (this is the only tool that stays in McpServer)
        server.addTool(
            name = "join_channel",
            description = "Join a specific channel to communicate with Figma",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("channel") {
                        put("type", "string")
                        put("description", "The name of the channel to join")
                    }
                },
                required = listOf("channel")
            )
        ) { request ->
            val startTime = System.currentTimeMillis()
            val channel = request.arguments["channel"]?.jsonPrimitive?.content
            
            if (channel.isNullOrBlank()) {
                val duration = System.currentTimeMillis() - startTime
                // Track validation failure
                kr.co.metadata.mcp.mcp.BaseFigmaService.analyticsService?.sendMcpToolCall(
                    toolName = "join_channel",
                    success = false,
                    duration = duration,
                    errorMessage = "Channel name is required",
                    resultType = "validation_error"
                )
                
                CallToolResult(
                    content = listOf(TextContent("Channel name is required"))
                )
            } else {
                try {
                    logger.info { "Joining channel: $channel" }
                    runBlocking {
                        joinChannel(channel)
                    }
                    
                    val duration = System.currentTimeMillis() - startTime
                    // Track successful tool call
                    kr.co.metadata.mcp.mcp.BaseFigmaService.analyticsService?.sendMcpToolCall(
                        toolName = "join_channel",
                        success = true,
                        duration = duration,
                        resultType = "success"
                    )
                    
                    CallToolResult(
                        content = listOf(TextContent("Successfully joined channel: $channel"))
                    )
                } catch (e: Exception) {
                    val duration = System.currentTimeMillis() - startTime
                    logger.error { "Failed to join channel '$channel': ${e.message}" }
                    
                    // Track execution failure
                    kr.co.metadata.mcp.mcp.BaseFigmaService.analyticsService?.sendMcpToolCall(
                        toolName = "join_channel",
                        success = false,
                        duration = duration,
                        errorMessage = e.message ?: "Unknown error",
                        resultType = "execution_error"
                    )
                    
                    CallToolResult(
                        content = listOf(TextContent("Error joining channel '$channel': ${e.message}. Make sure Figma is open and WebSocket server is running."))
                    )
                }
            }
        }
        
        // Register all Figma tools using the new service architecture
        try {
                    kr.co.metadata.mcp.mcp.FigmaMcpTools.registerAllTools(server, ::sendCommandToFigma)
        kr.co.metadata.mcp.mcp.FigmaMcpTools.registerAllResources(server, ::sendCommandToFigma)
        kr.co.metadata.mcp.mcp.FigmaMcpTools.registerAllPrompts(server)
            
            logger.info { "MCP server configured with tools, resources, and prompts" }
        } catch (e: Exception) {
            logger.error(e) { "Failed to configure MCP server tools" }
            throw e
        }
    }
} 
