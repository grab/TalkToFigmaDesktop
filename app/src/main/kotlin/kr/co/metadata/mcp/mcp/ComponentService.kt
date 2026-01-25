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
 * Service for managing Figma components and styles
 * Provides tools for getting styles, managing components, and handling instance overrides
 */
object ComponentService : BaseFigmaService() {

    /**
     * Register all component and style-related tools
     */
    fun registerTools(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        // Register all component styles tools
        registerGetStyles(server, figmaCommandSender)
        registerGetLocalComponents(server, figmaCommandSender)
        registerCreateComponentInstance(server, figmaCommandSender)
        registerGetInstanceOverrides(server, figmaCommandSender)
        registerSetInstanceOverrides(server, figmaCommandSender)
        
        logger.info { "Component styles service tools registered successfully" }
    }

    /**
     * Get information about local styles
     */
    private fun registerGetStyles(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "get_styles",
            description = "Get information about local styles",
            inputSchema = Tool.Input()
        ) { _ ->
            kotlinx.coroutines.runBlocking {
                executeFigmaCommand(
                    command = "get_styles",
                    params = emptyMap(),
                    figmaCommandSender = figmaCommandSender,
                    operation = "getting styles"
                )
            }
        }
    }

    /**
     * Get information about local components
     */
    private fun registerGetLocalComponents(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "get_local_components",
            description = "Get information about local components",
            inputSchema = Tool.Input()
        ) { _ ->
            kotlinx.coroutines.runBlocking {
                executeFigmaCommand(
                    command = "get_local_components",
                    params = emptyMap(),
                    figmaCommandSender = figmaCommandSender,
                    operation = "getting local components"
                )
            }
        }
    }

    /**
     * Create an instance of a component
     */
    private fun registerCreateComponentInstance(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "create_component_instance",
            description = "Create an instance of a component",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("componentKey") {
                        put("type", "string")
                        put("description", "Key of the component to instantiate")
                    }
                    putJsonObject("x") {
                        put("type", "number")
                        put("description", "X position")
                    }
                    putJsonObject("y") {
                        put("type", "number")
                        put("description", "Y position")
                    }
                },
                required = listOf("componentKey", "x", "y")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val componentKey = request.arguments["componentKey"].safeString("componentKey")
                    val x = request.arguments["x"].safeDouble("x")
                    val y = request.arguments["y"].safeDouble("y")
                    
                    val params = mapOf<String, Any>(
                        "componentKey" to componentKey,
                        "x" to x,
                        "y" to y
                    )
                    
                    val result = figmaCommandSender("create_component_instance", params)
                    createSuccessResponse("Created component instance: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("creating component instance", e)
                }
            }
        }
    }

    /**
     * Extract override properties from a selected component instance
     */
    private fun registerGetInstanceOverrides(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "get_instance_overrides",
            description = "Extract override properties from a selected component instance",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "Optional ID of the component instance to get overrides from. If not provided, currently selected instance will be used.")
                    }
                },
                required = emptyList()
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val nodeId = request.arguments["nodeId"]?.jsonPrimitive?.content
                    
                    val params = buildMap<String, Any> {
                        nodeId?.let { put("instanceNodeId", it as Any) }
                    }
                    
                    val result = figmaCommandSender("get_instance_overrides", params)
                    createSuccessResponse("Retrieved instance overrides: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("getting instance overrides", e)
                }
            }
        }
    }

    /**
     * Apply extracted overrides to target instances
     */
    private fun registerSetInstanceOverrides(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_instance_overrides",
            description = "Apply extracted overrides to target instances",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("sourceInstanceId") {
                        put("type", "string")
                        put("description", "ID of the source component instance")
                    }
                    putJsonObject("targetNodeIds") {
                        put("type", "array")
                        put("description", "Array of target instance IDs. Currently selected instances will be used.")
                        putJsonObject("items") {
                            put("type", "string")
                        }
                    }
                },
                required = listOf("sourceInstanceId", "targetNodeIds")
            )
        ) { request ->
            kotlinx.coroutines.runBlocking {
                try {
                    val sourceInstanceId = request.arguments["sourceInstanceId"].safeString("sourceInstanceId")
                    val targetNodeIds = request.arguments["targetNodeIds"]?.jsonArray?.map { 
                        it.jsonPrimitive.content 
                    } ?: throw IllegalArgumentException("targetNodeIds is required")
                    
                    val params = mapOf<String, Any>(
                        "sourceInstanceId" to sourceInstanceId,
                        "targetNodeIds" to targetNodeIds
                    )
                    
                    val result = figmaCommandSender("set_instance_overrides", params)
                    createSuccessResponse("Applied instance overrides to ${targetNodeIds.size} instances: ${result}")
                } catch (e: Exception) {
                    createErrorResponse("setting instance overrides", e)
                }
            }
        }
    }
} 
