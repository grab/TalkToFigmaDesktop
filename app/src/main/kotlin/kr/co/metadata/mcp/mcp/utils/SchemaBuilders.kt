package kr.co.metadata.mcp.mcp.utils

import kotlinx.serialization.json.*

/**
 * Reusable schema builders for common Figma tool parameters
 * Eliminates duplication across service files
 */
object SchemaBuilders {

    /**
     * Build a node ID property schema
     */
    fun nodeIdProperty(
        description: String = "The ID of the node",
        required: Boolean = true
    ): Pair<String, JsonObject> {
        return "nodeId" to buildJsonObject {
            put("type", "string")
            put("description", description)
        }
    }

    /**
     * Build X coordinate property schema
     */
    fun xProperty(description: String = "X position"): Pair<String, JsonObject> {
        return "x" to buildJsonObject {
            put("type", "number")
            put("description", description)
        }
    }

    /**
     * Build Y coordinate property schema
     */
    fun yProperty(description: String = "Y position"): Pair<String, JsonObject> {
        return "y" to buildJsonObject {
            put("type", "number")
            put("description", description)
        }
    }

    /**
     * Build width property schema
     */
    fun widthProperty(description: String = "Width"): Pair<String, JsonObject> {
        return "width" to buildJsonObject {
            put("type", "number")
            put("description", description)
        }
    }

    /**
     * Build height property schema
     */
    fun heightProperty(description: String = "Height"): Pair<String, JsonObject> {
        return "height" to buildJsonObject {
            put("type", "number")
            put("description", description)
        }
    }

    /**
     * Build name property schema
     */
    fun nameProperty(description: String = "Name"): Pair<String, JsonObject> {
        return "name" to buildJsonObject {
            put("type", "string")
            put("description", description)
        }
    }

    /**
     * Build parent ID property schema
     */
    fun parentIdProperty(
        description: String = "Optional parent node ID"
    ): Pair<String, JsonObject> {
        return "parentId" to buildJsonObject {
            put("type", "string")
            put("description", description)
        }
    }

    /**
     * Build a complete RGBA color object schema
     */
    fun colorProperty(
        propertyName: String = "color",
        description: String = "Color in RGBA format"
    ): Pair<String, JsonObject> {
        return propertyName to buildJsonObject {
            put("type", "object")
            put("description", description)
            putJsonObject("properties") {
                putJsonObject("r") {
                    put("type", "number")
                    put("minimum", 0)
                    put("maximum", 1)
                    put("description", "Red component (0-1)")
                }
                putJsonObject("g") {
                    put("type", "number")
                    put("minimum", 0)
                    put("maximum", 1)
                    put("description", "Green component (0-1)")
                }
                putJsonObject("b") {
                    put("type", "number")
                    put("minimum", 0)
                    put("maximum", 1)
                    put("description", "Blue component (0-1)")
                }
                putJsonObject("a") {
                    put("type", "number")
                    put("minimum", 0)
                    put("maximum", 1)
                    put("description", "Alpha component (0-1)")
                }
            }
        }
    }

    /**
     * Build individual color component property schemas (for inline colors)
     */
    fun colorComponentProperties(): List<Pair<String, JsonObject>> {
        return listOf(
            "r" to buildJsonObject {
                put("type", "number")
                put("minimum", 0)
                put("maximum", 1)
                put("description", "Red component (0-1)")
            },
            "g" to buildJsonObject {
                put("type", "number")
                put("minimum", 0)
                put("maximum", 1)
                put("description", "Green component (0-1)")
            },
            "b" to buildJsonObject {
                put("type", "number")
                put("minimum", 0)
                put("maximum", 1)
                put("description", "Blue component (0-1)")
            },
            "a" to buildJsonObject {
                put("type", "number")
                put("minimum", 0)
                put("maximum", 1)
                put("description", "Alpha component (0-1)")
            }
        )
    }

    /**
     * Build a number property with min/max constraints
     */
    fun numberProperty(
        name: String,
        description: String,
        minimum: Double? = null,
        maximum: Double? = null
    ): Pair<String, JsonObject> {
        return name to buildJsonObject {
            put("type", "number")
            put("description", description)
            minimum?.let { put("minimum", it) }
            maximum?.let { put("maximum", it) }
        }
    }

    /**
     * Build a string property
     */
    fun stringProperty(
        name: String,
        description: String
    ): Pair<String, JsonObject> {
        return name to buildJsonObject {
            put("type", "string")
            put("description", description)
        }
    }

    /**
     * Build an enum property
     */
    fun enumProperty(
        name: String,
        description: String,
        values: List<String>
    ): Pair<String, JsonObject> {
        return name to buildJsonObject {
            put("type", "string")
            put("enum", JsonArray(values.map { JsonPrimitive(it) }))
            put("description", description)
        }
    }

    /**
     * Helper to build Tool.Input from property pairs
     */
    fun buildToolInput(
        vararg properties: Pair<String, JsonObject>,
        required: List<String> = emptyList()
    ): io.modelcontextprotocol.kotlin.sdk.Tool.Input {
        return io.modelcontextprotocol.kotlin.sdk.Tool.Input(
            properties = buildJsonObject {
                properties.forEach { (name, schema) ->
                    put(name, schema)
                }
            },
            required = required
        )
    }
}
