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
 * Service for managing Figma node layout and organization
 * Provides tools for moving, resizing, deleting, and cloning nodes
 */
object LayoutManagementService : BaseFigmaService() {

    /**
     * Register all layout and organization-related tools
     */
    fun registerTools(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        // Register all layout organization tools
        registerMoveNode(server, figmaCommandSender)
        registerResizeNode(server, figmaCommandSender)
        registerDeleteNode(server, figmaCommandSender)
        registerDeleteMultipleNodes(server, figmaCommandSender)
        registerCloneNode(server, figmaCommandSender)
        
        logger.info { "Layout organization service tools registered successfully" }
    }

    /**
     * Move a node to a new position
     */
    private fun registerMoveNode(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "move_node",
            description = "Move a node to a new position",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the node to move")
                    }
                    putJsonObject("x") {
                        put("type", "number")
                        put("description", "New X position")
                    }
                    putJsonObject("y") {
                        put("type", "number")
                        put("description", "New Y position")
                    }
                },
                required = listOf("nodeId", "x", "y")
            )
        ) { arguments ->
            kotlinx.coroutines.runBlocking {
                executeFigmaCommand(
                    command = "move_node",
                    params = arguments.arguments.toMap(),
                    figmaCommandSender = figmaCommandSender,
                    operation = "moving node"
                )
            }
        }
    }

    /**
     * Resize a node with new dimensions
     */
    private fun registerResizeNode(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "resize_node",
            description = "Resize a node with new dimensions",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the node to resize")
                    }
                    putJsonObject("width") {
                        put("type", "number")
                        put("minimum", 0)
                        put("description", "New width")
                    }
                    putJsonObject("height") {
                        put("type", "number")
                        put("minimum", 0)
                        put("description", "New height")
                    }
                },
                required = listOf("nodeId", "width", "height")
            )
        ) { arguments ->
            kotlinx.coroutines.runBlocking {
                executeFigmaCommand(
                    command = "resize_node",
                    params = arguments.arguments.toMap(),
                    figmaCommandSender = figmaCommandSender,
                    operation = "resizing node"
                )
            }
        }
    }

    /**
     * Delete a node
     */
    private fun registerDeleteNode(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "delete_node",
            description = "Delete a node",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the node to delete")
                    }
                },
                required = listOf("nodeId")
            )
        ) { arguments ->
            kotlinx.coroutines.runBlocking {
                executeFigmaCommand(
                    command = "delete_node",
                    params = arguments.arguments.toMap(),
                    figmaCommandSender = figmaCommandSender,
                    operation = "deleting node"
                )
            }
        }
    }

    /**
     * Delete multiple nodes at once efficiently
     */
    private fun registerDeleteMultipleNodes(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "delete_multiple_nodes",
            description = "Delete multiple nodes at once efficiently",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeIds") {
                        put("type", "array")
                        put("description", "Array of node IDs to delete")
                        putJsonObject("items") {
                            put("type", "string")
                        }
                    }
                },
                required = listOf("nodeIds")
            )
        ) { arguments ->
            kotlinx.coroutines.runBlocking {
                executeFigmaCommand(
                    command = "delete_multiple_nodes",
                    params = arguments.arguments.toMap(),
                    figmaCommandSender = figmaCommandSender,
                    operation = "deleting multiple nodes"
                )
            }
        }
    }

    /**
     * Create a copy of an existing node with optional position offset
     */
    private fun registerCloneNode(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "clone_node",
            description = "Create a copy of an existing node with optional position offset",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeId") {
                        put("type", "string")
                        put("description", "The ID of the node to clone")
                    }
                    putJsonObject("x") {
                        put("type", "number")
                        put("description", "New X position for the clone")
                    }
                    putJsonObject("y") {
                        put("type", "number")
                        put("description", "New Y position for the clone")
                    }
                },
                required = listOf("nodeId")
            )
        ) { arguments ->
            kotlinx.coroutines.runBlocking {
                executeFigmaCommand(
                    command = "clone_node",
                    params = arguments.arguments.toMap(),
                    figmaCommandSender = figmaCommandSender,
                    operation = "cloning node"
                )
            }
        }
    }
} 
