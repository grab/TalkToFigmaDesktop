package kr.co.metadata.mcp.mcp.utils

import kotlinx.serialization.json.*

/**
 * Utilities for parsing and handling color objects
 */
object ColorUtils {

    /**
     * Parse an RGBA color object from JSON
     * Returns a map with r, g, b, a components
     */
    fun parseColorObject(colorJson: JsonObject?): Map<String, Double>? {
        if (colorJson == null) return null

        val colorMap = mutableMapOf<String, Double>()
        colorJson["r"]?.jsonPrimitive?.double?.let { colorMap["r"] = it }
        colorJson["g"]?.jsonPrimitive?.double?.let { colorMap["g"] = it }
        colorJson["b"]?.jsonPrimitive?.double?.let { colorMap["b"] = it }
        colorJson["a"]?.jsonPrimitive?.double?.let { colorMap["a"] = it }

        return if (colorMap.isNotEmpty()) colorMap else null
    }

    /**
     * Parse RGBA color components from individual arguments
     * Extracts r, g, b, a from request arguments
     */
    fun parseColorComponents(
        arguments: JsonObject,
        alphaDefault: Double = 1.0
    ): Map<String, Double> {
        return mapOf(
            "r" to (arguments["r"]?.jsonPrimitive?.double ?: 0.0),
            "g" to (arguments["g"]?.jsonPrimitive?.double ?: 0.0),
            "b" to (arguments["b"]?.jsonPrimitive?.double ?: 0.0),
            "a" to (arguments["a"]?.jsonPrimitive?.double ?: alphaDefault)
        )
    }

    /**
     * Create a default black color
     */
    fun defaultBlackColor(): Map<String, Double> {
        return mapOf("r" to 0.0, "g" to 0.0, "b" to 0.0, "a" to 1.0)
    }

    /**
     * Create a default white color
     */
    fun defaultWhiteColor(): Map<String, Double> {
        return mapOf("r" to 1.0, "g" to 1.0, "b" to 1.0, "a" to 1.0)
    }

    /**
     * Format a color map as a readable string
     */
    fun formatColor(color: Map<String, Double>): String {
        val r = color["r"] ?: 0.0
        val g = color["g"] ?: 0.0
        val b = color["b"] ?: 0.0
        val a = color["a"] ?: 1.0
        return "RGBA($r, $g, $b, $a)"
    }
}
