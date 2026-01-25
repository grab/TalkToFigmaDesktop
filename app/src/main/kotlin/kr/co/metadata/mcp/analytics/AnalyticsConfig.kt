/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.analytics

import mu.KotlinLogging
import java.util.Properties

/**
 * Analytics configuration - supports both environment variables and properties file
 * Priority: Environment variables > analytics.properties file
 */
class AnalyticsConfig {
    private val logger = KotlinLogging.logger {}
    
    val measurementId: String?
    val apiSecret: String?
    
    init {
        // Load from analytics.properties file first
        val properties = Properties()
        var propertiesLoaded = false
        
        try {
            val propertiesStream = this::class.java.classLoader.getResourceAsStream("analytics.properties")
            if (propertiesStream != null) {
                properties.load(propertiesStream)
                propertiesLoaded = true
                logger.debug { "Analytics properties file loaded successfully" }
            }
        } catch (e: Exception) {
            logger.warn(e) { "Failed to load analytics.properties file: ${e.message}" }
        }
        
        // Process template variables in properties
        val rawMeasurementId = properties.getProperty("analytics.measurement.id")
        val rawApiSecret = properties.getProperty("analytics.api.secret")
        
        // Replace template placeholders with environment variables
        val processedMeasurementId = processTemplate(rawMeasurementId)
        val processedApiSecret = processTemplate(rawApiSecret)
        
        // Priority: Environment variables > processed properties file > raw properties
        measurementId = System.getenv("GOOGLE_ANALYTICS_ID") 
            ?: processedMeasurementId?.takeIf { it.isNotBlank() }
            ?: rawMeasurementId?.takeIf { it.isNotBlank() && !it.contains("{{") }
        
        apiSecret = System.getenv("GOOGLE_ANALYTICS_API_SECRET") 
            ?: processedApiSecret?.takeIf { it.isNotBlank() }
            ?: rawApiSecret?.takeIf { it.isNotBlank() && !it.contains("{{") }
        
        // Log configuration source
        val envConfigured = System.getenv("GOOGLE_ANALYTICS_ID") != null && System.getenv("GOOGLE_ANALYTICS_API_SECRET") != null
        val templateConfigured = propertiesLoaded && 
            !measurementId.isNullOrBlank() && !apiSecret.isNullOrBlank() &&
            (processedMeasurementId != rawMeasurementId || processedApiSecret != rawApiSecret)
        val propsConfigured = propertiesLoaded && 
            !measurementId.isNullOrBlank() && !apiSecret.isNullOrBlank()
        
        when {
            envConfigured -> {
                logger.info { "✅ GA4 configured from environment variables" }
            }
            templateConfigured -> {
                logger.info { "✅ GA4 configured from analytics.properties template with environment variables" }
            }
            propsConfigured -> {
                logger.info { "✅ GA4 configured from analytics.properties file" }
            }
            else -> {
                logger.warn { "⚠️ GA4 not configured - set GOOGLE_ANALYTICS_ID and GOOGLE_ANALYTICS_API_SECRET environment variables or check analytics.properties file" }
            }
        }
        
        logger.info { "Analytics configuration loaded successfully" }
    }
    
    /**
     * Process template variables in format {{VARIABLE_NAME}}
     */
    private fun processTemplate(value: String?): String? {
        if (value.isNullOrBlank()) return value
        
        var processed = value
        val templatePattern = Regex("\\{\\{([^}]+)\\}\\}")
        
        templatePattern.findAll(value).forEach { matchResult ->
            val fullMatch = matchResult.value  // {{VARIABLE_NAME}}
            val variableName = matchResult.groupValues[1]  // VARIABLE_NAME
            val envValue = System.getenv(variableName)
            
            if (envValue != null) {
                processed = processed?.replace(fullMatch, envValue)
                logger.debug { "Replaced template variable $fullMatch with environment value" }
            } else {
                logger.debug { "Template variable $fullMatch not found in environment" }
            }
        }
        
        return processed
    }
    
    /**
     * Check if analytics is properly configured
     */
    fun isConfigured(): Boolean {
        return !measurementId.isNullOrBlank() && !apiSecret.isNullOrBlank()
    }
    
    /**
     * Get basic system info for debugging
     */
    fun getSystemInfo(): String {
        val os = System.getProperty("os.name")
        val osVersion = System.getProperty("os.version")
        val arch = System.getProperty("os.arch")
        return "$os $osVersion ($arch)"
    }
}
