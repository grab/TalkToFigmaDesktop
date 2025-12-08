package kr.co.metadata.mcp.mcp.utils

import kotlinx.serialization.json.*

/**
 * Helper utilities for extracting parameters from tool requests
 * Reduces boilerplate code in service files
 */
object ParameterExtractors {

    /**
     * Extract required string parameter
     */
    fun JsonObject.requireString(key: String): String {
        return this[key]?.jsonPrimitive?.content
            ?: throw IllegalArgumentException("$key is required")
    }

    /**
     * Extract optional string parameter
     */
    fun JsonObject.optionalString(key: String, default: String? = null): String? {
        return this[key]?.jsonPrimitive?.content ?: default
    }

    /**
     * Extract required double parameter
     */
    fun JsonObject.requireDouble(key: String): Double {
        return this[key]?.jsonPrimitive?.double
            ?: throw IllegalArgumentException("$key is required")
    }

    /**
     * Extract optional double parameter
     */
    fun JsonObject.optionalDouble(key: String, default: Double? = null): Double? {
        return this[key]?.jsonPrimitive?.double ?: default
    }

    /**
     * Extract required int parameter
     */
    fun JsonObject.requireInt(key: String): Int {
        return this[key]?.jsonPrimitive?.int
            ?: throw IllegalArgumentException("$key is required")
    }

    /**
     * Extract optional int parameter
     */
    fun JsonObject.optionalInt(key: String, default: Int? = null): Int? {
        return this[key]?.jsonPrimitive?.int ?: default
    }

    /**
     * Extract required boolean parameter
     */
    fun JsonObject.requireBoolean(key: String): Boolean {
        return this[key]?.jsonPrimitive?.boolean
            ?: throw IllegalArgumentException("$key is required")
    }

    /**
     * Extract optional boolean parameter
     */
    fun JsonObject.optionalBoolean(key: String, default: Boolean = false): Boolean {
        return this[key]?.jsonPrimitive?.boolean ?: default
    }

    /**
     * Extract JsonObject parameter
     */
    fun JsonObject.optionalJsonObject(key: String): JsonObject? {
        return this[key]?.jsonObject
    }

    /**
     * Extract JsonArray parameter
     */
    fun JsonObject.optionalJsonArray(key: String): JsonArray? {
        return this[key]?.jsonArray
    }

    /**
     * Build a params map with only non-null values
     * Useful for building Figma command parameters
     */
    fun buildParams(vararg pairs: Pair<String, Any?>): Map<String, Any> {
        return pairs
            .filter { it.second != null }
            .associate { it.first to it.second!! }
    }

    /**
     * Build a mutable params map and add optional values
     */
    fun buildMutableParams(
        required: Map<String, Any>,
        optional: Map<String, Any?> = emptyMap()
    ): MutableMap<String, Any> {
        val params = required.toMutableMap()
        optional.forEach { (key, value) ->
            value?.let { params[key] = it }
        }
        return params
    }

    /**
     * Extract common position and size parameters
     */
    fun JsonObject.extractPositionAndSize(): Map<String, Any> {
        return mapOf(
            "x" to requireDouble("x"),
            "y" to requireDouble("y"),
            "width" to requireDouble("width"),
            "height" to requireDouble("height")
        )
    }

    /**
     * Extract common optional properties (name, parentId)
     */
    fun JsonObject.extractCommonOptionalProps(): Map<String, Any?> {
        return mapOf(
            "name" to optionalString("name"),
            "parentId" to optionalString("parentId")
        )
    }
}
