# Code Reusability Utilities

This package contains utility classes designed to reduce code duplication across Figma MCP service files.

## Overview

### Impact Summary

**StyleService Refactoring Results:**
- **Original:** 229 lines
- **Refactored:** 143 lines
- **Reduction:** 86 lines (-38%)

**Per-Method Improvements:**
- `registerSetFillColor`: 63 lines → 27 lines (-57%)
- `registerSetStrokeColor`: 76 lines → 30 lines (-61%)
- `registerSetCornerRadius`: 58 lines → 36 lines (-38%)

**Estimated Total Impact Across All Services:**
- 20-30 tool registration methods across codebase
- Expected ~500-700 lines of code reduction
- Improved maintainability and consistency

---

## Utility Classes

### 1. ToolRegistrationHelper

Reduces boilerplate in tool registration by providing wrapper functions.

#### Usage

**Before:**
```kotlin
private fun registerSetFillColor(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
    server.addTool(
        name = "set_fill_color",
        description = "Set the fill color...",
        inputSchema = Tool.Input(...)
    ) { request ->
        kotlinx.coroutines.runBlocking {
            try {
                val nodeId = request.arguments["nodeId"].safeString("nodeId")
                // ... 15+ more lines of parameter extraction
                val result = figmaCommandSender("set_fill_color", params)
                createSuccessResponse("Updated: ${result}")
            } catch (e: Exception) {
                createErrorResponse("setting fill color", e)
            }
        }
    }
}
```

**After:**
```kotlin
private fun registerSetFillColor(server: Server, figmaCommandSender: suspend (String, Map<String, Any>) -> Any) {
    ToolRegistrationHelper.registerSimpleTool(
        server = server,
        name = "set_fill_color",
        description = "Set the fill color...",
        inputSchema = SchemaBuilders.buildToolInput(...)
    ) { request ->
        val nodeId = request.arguments.requireString("nodeId")
        val color = ColorUtils.parseColorComponents(request.arguments)
        val result = figmaCommandSender("set_fill_color", mapOf("nodeId" to nodeId, "color" to color))
        createSuccessResponse("Updated: ${result}")
    }
}
```

#### Methods

- `registerSimpleTool()` - Wraps tool registration with automatic error handling and runBlocking
- `registerFigmaCommandTool()` - For simple pass-through tools that just extract params and call Figma
- `createSuccessResponse()` - Standard success response builder
- `createErrorResponse()` - Standard error response builder

---

### 2. SchemaBuilders

Provides reusable schema builders for common Figma properties.

#### Usage

**Before:**
```kotlin
inputSchema = Tool.Input(
    properties = buildJsonObject {
        putJsonObject("nodeId") {
            put("type", "string")
            put("description", "The ID of the node to modify")
        }
        putJsonObject("x") {
            put("type", "number")
            put("description", "X position")
        }
        putJsonObject("y") {
            put("type", "number")
            put("description", "Y position")
        }
        // ... 40+ more lines for color components
    },
    required = listOf("nodeId", "x", "y")
)
```

**After:**
```kotlin
inputSchema = SchemaBuilders.buildToolInput(
    SchemaBuilders.nodeIdProperty("The ID of the node to modify"),
    SchemaBuilders.xProperty(),
    SchemaBuilders.yProperty(),
    *SchemaBuilders.colorComponentProperties().toTypedArray(),
    required = listOf("nodeId", "x", "y")
)
```

#### Available Builders

**Common Properties:**
- `nodeIdProperty()` - Node ID string property
- `xProperty()` - X coordinate number property
- `yProperty()` - Y coordinate number property
- `widthProperty()` - Width number property
- `heightProperty()` - Height number property
- `nameProperty()` - Name string property
- `parentIdProperty()` - Parent node ID property

**Color Properties:**
- `colorProperty(name, description)` - Complete RGBA color object
- `colorComponentProperties()` - Individual r, g, b, a components

**Generic Builders:**
- `numberProperty(name, description, min?, max?)` - Number with constraints
- `stringProperty(name, description)` - String property
- `enumProperty(name, description, values)` - Enum/choice property

**Helper:**
- `buildToolInput(...properties, required)` - Builds Tool.Input from property pairs

---

### 3. ColorUtils

Centralizes color parsing and formatting logic.

#### Usage

**Before:**
```kotlin
val colorMap = mutableMapOf<String, Double>()
fillColor["r"]?.jsonPrimitive?.double?.let { colorMap["r"] = it }
fillColor["g"]?.jsonPrimitive?.double?.let { colorMap["g"] = it }
fillColor["b"]?.jsonPrimitive?.double?.let { colorMap["b"] = it }
fillColor["a"]?.jsonPrimitive?.double?.let { colorMap["a"] = it }
if (colorMap.isNotEmpty()) {
    params["fillColor"] = colorMap
} else {
    params["fillColor"] = mapOf("r" to 0.0, "g" to 0.0, "b" to 0.0, "a" to 1.0)
}
```

**After:**
```kotlin
val color = ColorUtils.parseColorObject(request.arguments["fillColor"]?.jsonObject)
    ?: ColorUtils.defaultBlackColor()
params["fillColor"] = color
```

#### Methods

- `parseColorObject(JsonObject?)` - Parse RGBA object
- `parseColorComponents(JsonObject, alphaDefault = 1.0)` - Parse r, g, b, a from arguments
- `defaultBlackColor()` - Returns black color map
- `defaultWhiteColor()` - Returns white color map
- `formatColor(Map<String, Double>)` - Format as "RGBA(r, g, b, a)" string

---

### 4. ParameterExtractors

Simplifies parameter extraction from tool requests.

#### Usage

**Before:**
```kotlin
val nodeId = request.arguments["nodeId"]?.jsonPrimitive?.content
    ?: throw IllegalArgumentException("nodeId is required")
val width = request.arguments["width"]?.jsonPrimitive?.double
    ?: throw IllegalArgumentException("width is required")
val name = request.arguments["name"]?.jsonPrimitive?.content ?: "Default"
val parentId = request.arguments["parentId"]?.jsonPrimitive?.content

val params = mutableMapOf<String, Any>("nodeId" to nodeId, "width" to width)
if (name != null) params["name"] = name
if (parentId != null) params["parentId"] = parentId
```

**After:**
```kotlin
import kr.co.metadata.mcp.mcp.utils.ParameterExtractors.requireString
import kr.co.metadata.mcp.mcp.utils.ParameterExtractors.requireDouble
import kr.co.metadata.mcp.mcp.utils.ParameterExtractors.optionalString
import kr.co.metadata.mcp.mcp.utils.ParameterExtractors.buildParams

val nodeId = request.arguments.requireString("nodeId")
val width = request.arguments.requireDouble("width")
val name = request.arguments.optionalString("name", "Default")
val parentId = request.arguments.optionalString("parentId")

val params = buildParams(
    "nodeId" to nodeId,
    "width" to width,
    "name" to name,
    "parentId" to parentId
)
```

#### Extension Functions

**Required Parameters:**
- `requireString(key)` - Extract required string
- `requireDouble(key)` - Extract required double
- `requireInt(key)` - Extract required int
- `requireBoolean(key)` - Extract required boolean

**Optional Parameters:**
- `optionalString(key, default?)` - Extract optional string
- `optionalDouble(key, default?)` - Extract optional double
- `optionalInt(key, default?)` - Extract optional int
- `optionalBoolean(key, default)` - Extract optional boolean
- `optionalJsonObject(key)` - Extract optional JSON object
- `optionalJsonArray(key)` - Extract optional JSON array

**Helpers:**
- `buildParams(...pairs)` - Build map filtering out nulls
- `buildMutableParams(required, optional)` - Build mutable map with optionals
- `extractPositionAndSize()` - Extract x, y, width, height in one call
- `extractCommonOptionalProps()` - Extract name, parentId

---

## Migration Guide

### Step 1: Add Imports

```kotlin
import kr.co.metadata.mcp.mcp.utils.SchemaBuilders
import kr.co.metadata.mcp.mcp.utils.ToolRegistrationHelper
import kr.co.metadata.mcp.mcp.utils.ParameterExtractors.requireString
import kr.co.metadata.mcp.mcp.utils.ParameterExtractors.requireDouble
import kr.co.metadata.mcp.mcp.utils.ParameterExtractors.optionalDouble
import kr.co.metadata.mcp.mcp.utils.ColorUtils
```

### Step 2: Replace Tool Registration

Replace:
```kotlin
server.addTool(...) { request ->
    kotlinx.coroutines.runBlocking {
        try {
            // handler code
        } catch (e: Exception) {
            createErrorResponse("operation", e)
        }
    }
}
```

With:
```kotlin
ToolRegistrationHelper.registerSimpleTool(...) { request ->
    // handler code (error handling automatic)
}
```

### Step 3: Simplify Schema Building

Replace manual `buildJsonObject` blocks with `SchemaBuilders` methods.

### Step 4: Use Parameter Extractors

Replace manual parameter extraction with extension functions.

### Step 5: Use ColorUtils

Replace color parsing blocks with `ColorUtils` methods.

---

## See Also

- `StyleService.kt` - Refactored example demonstrating all utilities
- `BaseFigmaService.kt` - Base service class with shared functionality

---

## Future Improvements

Potential additional utilities:
1. **Layout Property Builders** - Reusable schemas for layout modes, padding, etc.
2. **Validation Helpers** - Common validation patterns
3. **Response Formatters** - Standardized response formatting
4. **Array Parameter Handlers** - Simplify array parameter extraction
