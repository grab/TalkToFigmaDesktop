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
 * Service for managing Figma prototyping and connections
 * Provides tools for getting prototype reactions, setting connectors, and creating connections
 */
object PrototypeService : BaseFigmaService() {

    /**
     * Register all prototype-related tools
     */
    fun registerTools(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        // Register prototype reaction tools
        registerGetReactions(server, figmaCommandSender)
        
        // NOTE: Connector tools have been disabled due to Figma API deprecation
        // Figma has officially blocked the FigJam Connector API
        // registerSetDefaultConnector(server, figmaCommandSender)
        // registerCreateConnections(server, figmaCommandSender)
        
        logger.info { "Prototype service tools registered successfully" }
    }

    /**
     * Get all prototype reactions from nodes with visual highlight animation
     */
    private fun registerGetReactions(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "get_reactions",
            description = "Get Figma Prototyping Reactions from multiple nodes for analyzing prototype flows and interactions.",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("nodeIds") {
                        put("type", "array")
                        put("description", "Array of node IDs to get reactions from")
                        put("items", buildJsonObject { put("type", "string") })
                    }
                },
                required = listOf("nodeIds")
            )
        ) { arguments ->
            kotlinx.coroutines.runBlocking {
                executeFigmaCommand(
                    command = "get_reactions",
                    params = arguments.arguments.toMap(),
                    figmaCommandSender = figmaCommandSender,
                    operation = "getting prototype reactions"
                )
            }
        }
    }

    // NOTE: Connector tools have been disabled due to Figma API deprecation
    // Figma has officially blocked the FigJam Connector API

    /*
    /**
     * Set a copied FigJam connector as the default connector style for creating connections
     */
    private fun registerSetDefaultConnector(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "set_default_connector",
            description = "Set a copied FigJam connector as the default connector style for creating connections (must be set before creating connections)",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("connectorId") {
                        put("type", "string")
                        put("description", "The ID of the connector node to set as default")
                    }
                }
            )
        ) { arguments ->
            kotlinx.coroutines.runBlocking {
                executeFigmaCommand(
                    command = "set_default_connector",
                    params = arguments.arguments.toMap(),
                    figmaCommandSender = figmaCommandSender,
                    operation = "setting default connector"
                )
            }
        }
    }

    /**
     * Create FigJam connector lines between nodes, based on prototype flows or custom mapping
     */
    private fun registerCreateConnections(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        server.addTool(
            name = "create_connections",
            description = "Create FigJam connector lines between nodes, based on prototype flows or custom mapping",
            inputSchema = Tool.Input(
                properties = buildJsonObject {
                    putJsonObject("connections") {
                        put("type", "array")
                        put("description", "Array of node connections to create")
                        putJsonObject("items") {
                            put("type", "object")
                            putJsonObject("properties") {
                                putJsonObject("startNodeId") {
                                    put("type", "string")
                                    put("description", "ID of the starting node")
                                }
                                putJsonObject("endNodeId") {
                                    put("type", "string")
                                    put("description", "ID of the ending node")
                                }
                                putJsonObject("text") {
                                    put("type", "string")
                                    put("description", "Optional text to display on the connector")
                                }
                            }
                        }
                    }
                },
                required = listOf("connections")
            )
        ) { arguments ->
            kotlinx.coroutines.runBlocking {
                executeFigmaCommand(
                    command = "create_connections",
                    params = arguments.arguments.toMap(),
                    figmaCommandSender = figmaCommandSender,
                    operation = "creating connections"
                )
            }
        }
    }
    */
} 
