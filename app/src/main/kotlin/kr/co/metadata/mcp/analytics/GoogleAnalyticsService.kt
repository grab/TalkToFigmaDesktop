/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.analytics

import java.awt.Toolkit
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.*
import java.util.Properties
import mu.KotlinLogging

/** Basic GA4 Measurement Protocol implementation */
class GoogleAnalyticsService {
    private val logger = KotlinLogging.logger {}

    // Use AnalyticsConfig for centralized configuration management
    private val analyticsConfig = AnalyticsConfig()
    private val measurementId: String? = analyticsConfig.measurementId
    private val apiSecret: String? = analyticsConfig.apiSecret

    // Basic device/environment info
    private val osName = System.getProperty("os.name")
    private val osVersion = System.getProperty("os.version")
    private val osArch = System.getProperty("os.arch")
    private val javaVersion = System.getProperty("java.version")
    private val userLocale = Locale.getDefault().toString()
    // ISO 639-1 language code per GA spec (e.g., "en", "ko")
    private val languageCode = Locale.getDefault().language

    // Generate persistent client ID for this app instance
    private val clientId = UUID.randomUUID().toString()

    // Generate persistent session ID for this app session
    private val sessionId = UUID.randomUUID().toString()

    // Get app version dynamically
    private val appVersion = getAppVersion()
    
    // Get bundle ID from system properties or default
    private val bundleId = getBundleId()

    // Get system timezone
    private val timeZone = TimeZone.getDefault().id
    private val screenResolution: String? = getScreenResolution()

    // Get public IP address for geographic info (cached for session)
    private val publicIpAddress: String? by lazy { fetchPublicIpAddress() }

    init {
        logger.info { "GA4 Analytics Service initialized" }
        logger.debug { "Measurement ID: $measurementId" }
        logger.debug { "Client ID: $clientId" }
        logger.debug { "Session ID: $sessionId" }
        logger.debug { "OS: $osName $osVersion ($osArch)" }
        logger.debug { "App Version: $appVersion" }
        logger.debug { "Timezone: $timeZone" }
    }

    /** Send page_view event (gtag.js standard) */
    fun sendPageView(pageTitle: String, pageLocation: String, pagePath: String? = null): Boolean {
        return sendEvent(
                "page_view",
                mapOf(
                        "page_title" to pageTitle,
                        "page_location" to pageLocation,
                        "page_path" to (pagePath ?: pageLocation)
                )
        )
    }

    /** Send app_start event (gtag.js standard for apps) */
    fun sendAppStart(): Boolean {
        return sendEvent("app_start", mapOf("app_version" to appVersion, "platform" to "desktop"))
    }

    /** Send user_engagement event (gtag.js standard) */
    fun sendUserEngagement(engagementTimeMs: Long = 1000): Boolean {
        return sendEvent("user_engagement", mapOf("engagement_time_msec" to engagementTimeMs))
    }

    /** Send server action event (custom) */
    fun sendServerAction(
            action: String,
            serverType: String,
            port: Int? = null,
            duration: Long? = null
    ): Boolean {
        val params = mutableMapOf<String, Any>("action" to action, "server_type" to serverType)
        port?.let { params["port"] = it }
        duration?.let { params["startup_time_ms"] = it }

        return sendEvent("server_action", params)
    }

    /** Send user action event (custom) */
    fun sendUserAction(
            action: String,
            category: String,
            label: String? = null,
            value: Int? = null
    ): Boolean {
        val params = mutableMapOf<String, Any>("action" to action, "category" to category)
        label?.let { params["label"] = it }
        value?.let { params["value"] = it }

        return sendEvent("user_action", params)
    }

    /** Send first_open event for new users (GA4 standard) */
    fun sendFirstOpen(): Boolean {
        return sendEvent("first_open", mapOf("platform" to "desktop"))
    }

    /** Send MCP tool call event (custom) */
    fun sendMcpToolCall(
        toolName: String,
        success: Boolean,
        duration: Long? = null,
        errorMessage: String? = null,
        resultType: String? = null
    ): Boolean {
        val params = mutableMapOf<String, Any>(
            "tool_name" to toolName,
            "success" to success,
            "category" to "mcp_tool"
        )
        duration?.let { params["duration_ms"] = it }
        errorMessage?.let { params["error_message"] = it }
        resultType?.let { params["result_type"] = it }

        return sendEvent("mcp_tool_call", params)
    }

    /** Send app_exception event compatible with GA4 App Stability */
    fun sendAppException(
        fatal: Boolean,
        exceptionType: String,
        exceptionMessage: String? = null,
        threadName: String? = null,
        stacktraceTop: String? = null
    ): Boolean {
        // GA4 app_exception requires at least the fatal flag
        val params = mutableMapOf<String, Any>(
            "fatal" to fatal,
            // Helpful context as custom params (shown in GA4/Firebase but not required)
            "exception_type" to exceptionType.take(100)
        )
        exceptionMessage?.takeIf { it.isNotBlank() }?.let { params["exception_message"] = it.take(150) }
        threadName?.takeIf { it.isNotBlank() }?.let { params["thread_name"] = it.take(80) }
        stacktraceTop?.takeIf { it.isNotBlank() }?.let { params["top_stack_frame"] = it.take(180) }

        return sendEvent("app_exception", params)
    }

    /** Send any event to GA4 with custom parameters */
    private fun sendEvent(eventName: String, customParams: Map<String, Any> = emptyMap()): Boolean {
        if (!isConfigured()) {
            logger.warn { "GA4 not configured - skipping $eventName event" }
            return false
        }

        return try {
            val url =
                    URL(
                            "https://www.google-analytics.com/mp/collect" +
                                    "?measurement_id=$measurementId&api_secret=$apiSecret"
                    )

            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true

            // Base event parameters (keep minimal; tech info now goes into top-level "device")
            val params =
                    mutableMapOf<String, Any>(
                            "session_id" to sessionId,
                            "app_version" to appVersion,
                            "engagement_time_msec" to 1
                    )

            // Add custom parameters
            params.putAll(customParams)

            val paramsJson =
                    params.entries.joinToString(",\n") { (key, value) ->
                        if (value is String) "    \"$key\": \"$value\"" else "    \"$key\": $value"
                    }

            // Build GA4 Measurement Protocol "device" object per spec
            val deviceMap =
                    mutableMapOf<String, Any>(
                            "category" to "desktop",
                            "language" to languageCode,
                            "operating_system" to mapOperatingSystemName(osName),
                            "operating_system_version" to osVersion
                    )
            screenResolution?.let { deviceMap["screen_resolution"] = it }
            // Optional vendor brand
            getBrandForOS(osName)?.let { deviceMap["brand"] = it }

            val deviceJson =
                    deviceMap.entries.joinToString(",\n") { (key, value) ->
                        if (value is String) "    \"$key\": \"$value\"" else "    \"$key\": $value"
                    }

                         // User properties for app-specific context (not device info which goes in device object)
             // These will appear in GA4 User properties and Firebase
             val userPropsJson =
                     """
               "app_version": { "value": "$appVersion" },
               "bundle_id": { "value": "$bundleId" },
               "java_version": { "value": "$javaVersion" },
               "platform": { "value": "desktop" },
               "os_name": { "value": "${mapOperatingSystemName(osName)}" },
               "os_version": { "value": "$osVersion" },
               "screen_resolution": { "value": "${screenResolution ?: "unknown"}" }
             """.trimIndent()

            // Add ip_override for geographic data if available
            val ipOverrideSection = publicIpAddress?.let { "  \"ip_override\": \"$it\",\n" } ?: ""

            val body =
                    """
            {
              "client_id": "$clientId",
              $ipOverrideSection
              "device": {
                $deviceJson
              },
              "user_properties": {
              $userPropsJson
              },
              "events": [
                {
                  "name": "$eventName",
                  "params": {
                  $paramsJson
                  }
                }
              ]
            }
            """.trimIndent()

            logger.info { "Sending $eventName event to GA4" }
            logger.info { "Request body: $body" }

            conn.outputStream.use { it.write(body.toByteArray()) }

            val responseCode = conn.responseCode
            logger.info { "GA4 Response Code: $responseCode" }

            if (responseCode in 200..299) {
                logger.info { "✅ $eventName event sent successfully" }
                true
            } else {
                logger.warn { "❌ Failed to send $eventName event: $responseCode" }
                false
            }
        } catch (e: Exception) {
            logger.error(e) { "Error sending $eventName event" }
            false
        }
    }

    /** Check if GA4 is properly configured */
    private fun isConfigured(): Boolean {
        return !measurementId.isNullOrBlank() && !apiSecret.isNullOrBlank()
    }

    /** Get app version from version.properties */
    private fun getAppVersion(): String {
        return try {
            val properties = Properties()
            val versionStream = javaClass.getResourceAsStream("/version.properties")
            versionStream?.use { stream ->
                properties.load(stream)
                properties.getProperty("version", "unknown")
            }
                    ?: "unknown"
        } catch (e: Exception) {
            logger.warn(e) { "Failed to load app version from version.properties" }
            "unknown"
        }
    }

    /** Best-effort screen resolution in WIDTHxHEIGHT format for GA4 device.screen_resolution */
    private fun getScreenResolution(): String? {
        return try {
            val size = Toolkit.getDefaultToolkit().screenSize
            "${size.width}x${size.height}"
        } catch (e: Exception) {
            logger.debug(e) { "Unable to get screen resolution" }
            null
        }
    }

    /** Map JVM os.name to GA-friendly operating_system values (e.g., MacOS, Windows, Linux) */
    private fun mapOperatingSystemName(rawOsName: String?): String {
        val name = (rawOsName ?: "").lowercase(Locale.ROOT)
        return when {
            name.contains("mac") -> "MacOS"
            name.contains("win") -> "Windows"
            name.contains("nux") || name.contains("nix") -> "Linux"
            else -> rawOsName ?: "Unknown"
        }
    }

    /**
     * Fetch public IP address for geographic information in GA4 Fast, single-service approach with
     * quick timeout
     */
    private fun fetchPublicIpAddress(): String? {
        return try {
            val url = URL("https://api.ipify.org")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 1000 // 1 second
            connection.readTimeout = 1000
            connection.setRequestProperty("User-Agent", "TalkToFigmaDesktop/$appVersion")

            if (connection.responseCode == 200) {
                BufferedReader(InputStreamReader(connection.inputStream)).use { reader ->
                    val ip = reader.readText().trim()
                    if (ip.isNotBlank() && isValidIpAddress(ip)) {
                        logger.debug { "Retrieved public IP: $ip" }
                        return ip
                    }
                }
            }
            logger.debug { "Failed to get IP: HTTP ${connection.responseCode}" }
            null
        } catch (e: Exception) {
            logger.debug { "Unable to get public IP: ${e.message}" }
            null
        }
    }

    /** Basic IP address validation (IPv4) */
    private fun isValidIpAddress(ip: String): Boolean {
        return try {
            val parts = ip.split(".")
            parts.size == 4 &&
                    parts.all {
                        val num = it.toIntOrNull()
                        num != null && num in 0..255
                    }
        } catch (e: Exception) {
            false
        }
    }

    /** Infer a simple brand for desktop environments */
    private fun getBrandForOS(rawOsName: String?): String? {
        val name = (rawOsName ?: "").lowercase(Locale.ROOT)
        return when {
            name.contains("mac") -> "Apple"
            name.contains("win") -> "Microsoft"
            name.contains("linux") || name.contains("nux") || name.contains("nix") -> "Linux"
            else -> null
        }
    }
    
    /** Get bundle ID from system properties or default value */
    private fun getBundleId(): String {
        // Try to get from system properties first (might be set by build process)
        return System.getProperty("app.bundle.id") 
            ?: System.getProperty("java.application.name")
            ?: "kr.co.metadata.mcp.talktofigma" // Default bundle ID
    }
}
