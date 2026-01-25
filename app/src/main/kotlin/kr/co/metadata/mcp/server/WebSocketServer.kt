/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.server

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import mu.KotlinLogging
import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer
import java.net.InetSocketAddress
import java.util.concurrent.ConcurrentHashMap

private val logger = KotlinLogging.logger {}
private val mapper = jacksonObjectMapper()

/**
 * WebSocket server that handles multi-channel communication.
 * This server implements the socket.ts functionality for Figma plugin communication.
 */
class WebSocketServer(port: Int = DEFAULT_PORT) : WebSocketServer(InetSocketAddress("127.0.0.1", port)) {

    companion object {
        const val DEFAULT_PORT = 3055
    }

    // Store clients by channel - equivalent to socket.ts channels Map
    private val channels = ConcurrentHashMap<String, MutableSet<WebSocket>>()
    private val clientChannels = ConcurrentHashMap<WebSocket, String>()

    override fun onOpen(conn: WebSocket, handshake: ClientHandshake) {
        val welcomeMessage = mapOf(
            "type" to "system",
            "message" to "Please join a channel to start chatting"
        )
        
        logger.info { "🔌 New client connected: ${conn.remoteSocketAddress}" }
        
        // Send welcome message - equivalent to socket.ts handleConnection
        conn.send(mapper.writeValueAsString(welcomeMessage))
    }

    override fun onClose(conn: WebSocket, code: Int, reason: String?, remote: Boolean) {
        logger.info { "🔌 Client disconnected: ${conn.remoteSocketAddress}" }
        removeClientFromChannel(conn)
    }

    override fun onMessage(conn: WebSocket, message: String) {
        try {
            val data: Map<String, Any> = mapper.readValue(message)
            val type = data["type"] as? String

            // Only log debug info if debug logging is enabled
            logger.debug { "🔌 Received message type: $type from ${conn.remoteSocketAddress}" }

            when (type) {
                "join" -> handleJoin(conn, data)
                "message" -> handleMessage(conn, data)
                "progress_update" -> handleProgressUpdate(conn, data)
                else -> {
                    // For backward compatibility, treat unknown types as message
                    val channelName = clientChannels[conn]
                    if (channelName == null) {
                        val errorResponse = mapOf(
                            "type" to "error", 
                            "message" to "You must join a channel first"
                        )
                        logger.warn { "🔌 Client ${conn.remoteSocketAddress} not in channel, sending error" }
                        conn.send(mapper.writeValueAsString(errorResponse))
                        return
                    }
                    logger.debug { "🔌 Broadcasting unknown message type to channel: $channelName" }
                    broadcastToChannel(conn, channelName, message)
                }
            }
        } catch (e: Exception) {
            val errorResponse = mapOf(
                "type" to "error", 
                "message" to e.message
            )
            logger.error(e) { "❌ Error handling message from ${conn.remoteSocketAddress}: ${e.message}" }
            conn.send(mapper.writeValueAsString(errorResponse))
        }
    }

    private fun handleJoin(conn: WebSocket, data: Map<String, Any>) {
        val channelName = data["channel"] as? String
        val requestId = data["id"] as? String

        if (channelName.isNullOrBlank()) {
            conn.send(mapper.writeValueAsString(mapOf(
                "type" to "error", 
                "message" to "Channel name is required"
            )))
            return
        }

        // Remove client from previous channel
        removeClientFromChannel(conn)

        // Create channel if it doesn't exist and add client
        channels.computeIfAbsent(channelName) { ConcurrentHashMap.newKeySet() }.add(conn)
        clientChannels[conn] = channelName

        // Send success response to client
        val responsePayload = mutableMapOf<String, Any>(
            "result" to "Connected to channel: $channelName"
        )
        if (requestId != null) {
            responsePayload["id"] = requestId
        }

        val successResponse = mapOf(
            "type" to "system",
            "message" to responsePayload,
            "channel" to channelName
        )

        logger.debug { "🔌 Client ${conn.remoteSocketAddress} joined channel: '$channelName'" }
        conn.send(mapper.writeValueAsString(successResponse))

        // Notify other clients in the channel
        val notification = mapOf(
            "type" to "system",
            "message" to "A new user has joined the channel",
            "channel" to channelName
        )
        broadcastToChannel(conn, channelName, mapper.writeValueAsString(notification))
    }

    private fun handleMessage(conn: WebSocket, data: Map<String, Any>) {
        val channelName = data["channel"] as? String
        
        if (channelName.isNullOrBlank()) {
            conn.send(mapper.writeValueAsString(mapOf(
                "type" to "error",
                "message" to "Channel name is required"
            )))
            return
        }

        val channelClients = channels[channelName]
        if (channelClients == null || !channelClients.contains(conn)) {
            conn.send(mapper.writeValueAsString(mapOf(
                "type" to "error",
                "message" to "You must join the channel first"
            )))
            return
        }

        // Broadcast message to all clients in the channel
        val messageData = data["message"]
        val broadcastMessage = mapOf(
            "type" to "broadcast",
            "message" to messageData,
            "sender" to "System",
            "channel" to channelName
        )
        
        logger.debug { "🔌 Broadcasting message to channel: $channelName (${channelClients.size} clients)" }
        
        channelClients.forEach { client ->
            if (client.isOpen) {
                val clientMessage = broadcastMessage.toMutableMap()
                clientMessage["sender"] = if (client == conn) "You" else "User"
                client.send(mapper.writeValueAsString(clientMessage))
            }
        }
    }

    private fun handleProgressUpdate(conn: WebSocket, data: Map<String, Any>) {
        val channelName = clientChannels[conn]
        
        if (channelName == null) {
            val errorResponse = mapOf(
                "type" to "error", 
                "message" to "You must join a channel first"
            )
            logger.warn { "🔌 Client ${conn.remoteSocketAddress} not in channel for progress_update" }
            conn.send(mapper.writeValueAsString(errorResponse))
            return
        }

        // Forward progress update to other clients in the channel
        logger.debug { "🔌 Broadcasting progress_update to channel: $channelName" }
        broadcastToChannel(conn, channelName, mapper.writeValueAsString(data))
    }

    private fun removeClientFromChannel(conn: WebSocket) {
        val channelName = clientChannels.remove(conn)
        if (channelName != null) {
            val clients = channels[channelName]
            clients?.remove(conn)

            val notification = mapOf(
                "type" to "system",
                "message" to "A user has left the channel",
                "channel" to channelName
            )
            
            logger.debug { "🔌 Client ${conn.remoteSocketAddress} removed from channel: '$channelName'" }
            broadcastToChannel(null, channelName, mapper.writeValueAsString(notification))

            // Remove empty channels
            if (clients?.isEmpty() == true) {
                channels.remove(channelName)
                logger.debug { "🔌 Channel removed: '$channelName'" }
            }
        }
    }

    private fun broadcastToChannel(sender: WebSocket?, channelName: String, message: String) {
        channels[channelName]?.forEach { client ->
            if (client != sender && client.isOpen) {
                client.send(message)
            }
        }
    }

    override fun onError(conn: WebSocket?, ex: Exception) {
        logger.error(ex) { "❌ WebSocket error occurred for client: ${conn?.remoteSocketAddress}" }
    }

    override fun onStart() {
        logger.info { "🚀 WebSocket server started on port $port" }
    }
} 
