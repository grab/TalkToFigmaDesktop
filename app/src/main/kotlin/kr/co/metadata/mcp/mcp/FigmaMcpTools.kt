/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.mcp

import io.modelcontextprotocol.kotlin.sdk.*
import io.modelcontextprotocol.kotlin.sdk.server.Server
import kotlinx.serialization.json.*
import mu.KotlinLogging

/**
 * MCP Tools manager for Figma integration
 * Handles registration and management of all Figma-related MCP tools
 */
object FigmaMcpTools {
    private val logger = KotlinLogging.logger {}
    
    /**
     * Register all Figma tools with the MCP server
     */
    fun registerAllTools(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        logger.info { "Registering all Figma MCP tools..." }
        
        // Register document services
        DocumentService.registerTools(server, figmaCommandSender)
        
        // Register creation services  
        CreationService.registerTools(server, figmaCommandSender)
        
        // Register style services
        StyleService.registerTools(server, figmaCommandSender)
        
        // Register text services
        TextService.registerTools(server, figmaCommandSender)
        
        // Register layout services
        LayoutService.registerTools(server, figmaCommandSender)
        
        // Register annotation services
        AnnotationService.registerTools(server, figmaCommandSender)
        
        // Register prototype services
        PrototypeService.registerTools(server, figmaCommandSender)
        
        // Register layout management services
        LayoutManagementService.registerTools(server, figmaCommandSender)
        
        // Register component services
        ComponentService.registerTools(server, figmaCommandSender)
        
        // Register export services
        ExportService.registerTools(server, figmaCommandSender)
        
        logger.info { "All Figma MCP tools registered successfully" }
    }
    
    /**
     * Register all Figma resources with the MCP server
     */
    fun registerAllResources(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
        logger.info { "Registering all Figma MCP resources..." }
        
        // Register document resource
        server.addResource(
            uri = "figma://document/current",
            name = "Current Figma Document",
            description = "Information about the current Figma document",
            mimeType = "application/json"
        ) { request ->
            try {
                kotlinx.coroutines.runBlocking {
                    val result = figmaCommandSender("get_document_info", emptyMap())
                    ReadResourceResult(
                        contents = listOf(
                            TextResourceContents(
                                text = result.toString(),
                                uri = request.uri,
                                mimeType = "application/json"
                            )
                        )
                    )
                }
            } catch (e: Exception) {
                ReadResourceResult(
                    contents = listOf(
                        TextResourceContents(
                            text = "Error getting document info: ${e.message}",
                            uri = request.uri,
                            mimeType = "text/plain"
                        )
                    )
                )
            }
        }
        
        logger.info { "All Figma MCP resources registered successfully" }
    }
    
    /**
     * Register all Figma prompts with the MCP server
     */
    fun registerAllPrompts(server: Server) {
        logger.info { "Registering all Figma MCP prompts..." }
        
        // Use the dedicated FigmaPromptService to register all prompts
        FigmaPromptService.registerPrompts(server)
        
        logger.info { "All Figma MCP prompts registered successfully" }
    }
} 
