/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.mcp.validation

import kotlinx.serialization.Serializable

/**
 * Validation result sealed class
 */
sealed class ValidationResult<out T> {
    data class Success<T>(val value: T) : ValidationResult<T>()
    data class Error(val errors: List<String>) : ValidationResult<Nothing>()
}

/**
 * Simple validation DSL builder
 */
class ValidationContext {
    private val errors = mutableListOf<String>()
    
    fun validate(condition: Boolean, message: String) {
        if (!condition) {
            errors.add(message)
        }
    }
    
    fun hasErrors(): Boolean = errors.isNotEmpty()
    fun getErrors(): List<String> = errors.toList()
}

/**
 * Validation function type
 */
typealias Validator<T> = ValidationContext.(T) -> Unit

/**
 * Create a validator function
 */
fun <T> validator(block: ValidationContext.(T) -> Unit): Validator<T> = block

/**
 * Execute validation
 */
fun <T> validate(value: T, validator: Validator<T>): ValidationResult<T> {
    val context = ValidationContext()
    context.validator(value)
    return if (context.hasErrors()) {
        ValidationResult.Error(context.getErrors())
    } else {
        ValidationResult.Success(value)
    }
}

/**
 * RGBA Color validation - equivalent to Zod's RGBAColorSchema
 */
@Serializable
data class RGBAColor(
    val r: Double,
    val g: Double,
    val b: Double,
    val a: Double? = null
)

val rgbaColorValidator = validator<RGBAColor> { color ->
    validate(color.r in 0.0..1.0, "Red component must be between 0.0 and 1.0")
    validate(color.g in 0.0..1.0, "Green component must be between 0.0 and 1.0")
    validate(color.b in 0.0..1.0, "Blue component must be between 0.0 and 1.0")
    color.a?.let { alpha ->
        validate(alpha in 0.0..1.0, "Alpha component must be between 0.0 and 1.0")
    }
}

/**
 * Get Node Info validation - equivalent to z.object({ nodeId: z.string() })
 */
@Serializable
data class GetNodeInfoRequest(
    val nodeId: String
)

val getNodeInfoValidator = validator<GetNodeInfoRequest> { request ->
    validate(request.nodeId.isNotBlank(), "NodeId must not be blank")
}

/**
 * Get Nodes Info validation - equivalent to z.object({ nodeIds: z.array(z.string()) })
 */
@Serializable
data class GetNodesInfoRequest(
    val nodeIds: List<String>
)

val getNodesInfoValidator = validator<GetNodesInfoRequest> { request ->
    validate(request.nodeIds.isNotEmpty(), "NodeIds list must not be empty")
    request.nodeIds.forEachIndexed { index, nodeId ->
        validate(nodeId.isNotBlank(), "NodeId at index $index must not be blank")
    }
}

/**
 * Create Rectangle validation
 */
@Serializable
data class CreateRectangleRequest(
    val x: Double,
    val y: Double,
    val width: Double,
    val height: Double,
    val name: String? = null,
    val parentId: String? = null
)

val createRectangleValidator = validator<CreateRectangleRequest> { request ->
    validate(request.width >= 0.0, "Width must be non-negative")
    validate(request.height >= 0.0, "Height must be non-negative")
    request.name?.let { name ->
        validate(name.isNotBlank(), "Name must not be blank when provided")
    }
    request.parentId?.let { parentId ->
        validate(parentId.isNotBlank(), "ParentId must not be blank when provided")
    }
}

/**
 * Create Frame validation  
 */
@Serializable
data class CreateFrameRequest(
    val x: Double,
    val y: Double,
    val width: Double,
    val height: Double,
    val name: String? = null,
    val parentId: String? = null,
    val fillColor: RGBAColor? = null,
    val strokeColor: RGBAColor? = null,
    val strokeWeight: Double? = null,
    val layoutMode: String? = null,
    val layoutWrap: String? = null,
    val paddingTop: Double? = null,
    val paddingRight: Double? = null,
    val paddingBottom: Double? = null,
    val paddingLeft: Double? = null,
    val primaryAxisAlignItems: String? = null,
    val counterAxisAlignItems: String? = null,
    val layoutSizingHorizontal: String? = null,
    val layoutSizingVertical: String? = null,
    val itemSpacing: Double? = null
)

val createFrameValidator = validator<CreateFrameRequest> { request ->
    validate(request.width >= 0.0, "Width must be non-negative")
    validate(request.height >= 0.0, "Height must be non-negative")
    
    request.name?.let { name ->
        validate(name.isNotBlank(), "Name must not be blank when provided")
    }
    request.parentId?.let { parentId ->
        validate(parentId.isNotBlank(), "ParentId must not be blank when provided")
    }
    
    request.fillColor?.let { color ->
        val colorValidation = validate(color, rgbaColorValidator)
        if (colorValidation is ValidationResult.Error) {
            colorValidation.errors.forEach { error ->
                validate(false, "Fill color error: $error")
            }
        }
    }
    
    request.strokeColor?.let { color ->
        val colorValidation = validate(color, rgbaColorValidator)
        if (colorValidation is ValidationResult.Error) {
            colorValidation.errors.forEach { error ->
                validate(false, "Stroke color error: $error")
            }
        }
    }
    
    request.strokeWeight?.let { weight ->
        validate(weight >= 0.0, "Stroke weight must be non-negative")
    }
    
    request.layoutMode?.let { mode ->
        validate(mode in listOf("NONE", "HORIZONTAL", "VERTICAL"), "Layout mode must be one of: NONE, HORIZONTAL, VERTICAL")
    }
    
    request.layoutWrap?.let { wrap ->
        validate(wrap in listOf("NO_WRAP", "WRAP"), "Layout wrap must be one of: NO_WRAP, WRAP")
    }
    
    listOf(request.paddingTop, request.paddingRight, request.paddingBottom, request.paddingLeft).forEach { padding ->
        padding?.let { 
            validate(it >= 0.0, "Padding values must be non-negative")
        }
    }
    
    request.primaryAxisAlignItems?.let { align ->
        validate(align in listOf("MIN", "MAX", "CENTER", "SPACE_BETWEEN"), "Primary axis align must be one of: MIN, MAX, CENTER, SPACE_BETWEEN")
    }
    
    request.counterAxisAlignItems?.let { align ->
        validate(align in listOf("MIN", "MAX", "CENTER", "BASELINE"), "Counter axis align must be one of: MIN, MAX, CENTER, BASELINE")
    }
    
    request.layoutSizingHorizontal?.let { sizing ->
        validate(sizing in listOf("FIXED", "HUG", "FILL"), "Horizontal sizing must be one of: FIXED, HUG, FILL")
    }
    
    request.layoutSizingVertical?.let { sizing ->
        validate(sizing in listOf("FIXED", "HUG", "FILL"), "Vertical sizing must be one of: FIXED, HUG, FILL")
    }
    
    request.itemSpacing?.let { spacing ->
        validate(spacing >= 0.0, "Item spacing must be non-negative")
    }
}

/**
 * Create Text validation
 */
@Serializable
data class CreateTextRequest(
    val x: Double,
    val y: Double,
    val text: String,
    val fontSize: Double? = null,
    val fontWeight: Int? = null,
    val fontColor: RGBAColor? = null,
    val name: String? = null,
    val parentId: String? = null
)

val createTextValidator = validator<CreateTextRequest> { request ->
    validate(request.text.isNotBlank(), "Text must not be blank")
    request.fontSize?.let { fontSize ->
        validate(fontSize in 1.0..1000.0, "Font size must be between 1.0 and 1000.0")
    }
    request.fontWeight?.let { weight ->
        validate(weight in 100..900, "Font weight must be between 100 and 900")
    }
    request.fontColor?.let { color ->
        val colorValidation = validate(color, rgbaColorValidator)
        if (colorValidation is ValidationResult.Error) {
            colorValidation.errors.forEach { error ->
                validate(false, "Font color error: $error")
            }
        }
    }
    request.name?.let { name ->
        validate(name.isNotBlank(), "Name must not be blank when provided")
    }
    request.parentId?.let { parentId ->
        validate(parentId.isNotBlank(), "ParentId must not be blank when provided")
    }
}

/**
 * Set Fill Color validation
 */
@Serializable
data class SetFillColorRequest(
    val nodeId: String,
    val r: Double,
    val g: Double,
    val b: Double,
    val a: Double? = null
)

val setFillColorValidator = validator<SetFillColorRequest> { request ->
    validate(request.nodeId.isNotBlank(), "NodeId must not be blank")
    validate(request.r in 0.0..1.0, "Red component must be between 0.0 and 1.0")
    validate(request.g in 0.0..1.0, "Green component must be between 0.0 and 1.0")
    validate(request.b in 0.0..1.0, "Blue component must be between 0.0 and 1.0")
    request.a?.let { alpha ->
        validate(alpha in 0.0..1.0, "Alpha component must be between 0.0 and 1.0")
    }
}

/**
 * Move Node validation
 */
@Serializable
data class MoveNodeRequest(
    val nodeId: String,
    val x: Double,
    val y: Double
)

val moveNodeValidator = validator<MoveNodeRequest> { request ->
    validate(request.nodeId.isNotBlank(), "NodeId must not be blank")
}

/**
 * Resize Node validation
 */
@Serializable
data class ResizeNodeRequest(
    val nodeId: String,
    val width: Double,
    val height: Double
)

val resizeNodeValidator = validator<ResizeNodeRequest> { request ->
    validate(request.nodeId.isNotBlank(), "NodeId must not be blank")
    validate(request.width >= 0.0, "Width must be non-negative")
    validate(request.height >= 0.0, "Height must be non-negative")
}

/**
 * Delete Node validation
 */
@Serializable
data class DeleteNodeRequest(
    val nodeId: String
)

val deleteNodeValidator = validator<DeleteNodeRequest> { request ->
    validate(request.nodeId.isNotBlank(), "NodeId must not be blank")
}

/**
 * Delete Multiple Nodes validation
 */
@Serializable
data class DeleteMultipleNodesRequest(
    val nodeIds: List<String>
)

val deleteMultipleNodesValidator = validator<DeleteMultipleNodesRequest> { request ->
    validate(request.nodeIds.isNotEmpty(), "NodeIds list must not be empty")
    request.nodeIds.forEachIndexed { index, nodeId ->
        validate(nodeId.isNotBlank(), "NodeId at index $index must not be blank")
    }
}

/**
 * Clone Node validation
 */
@Serializable
data class CloneNodeRequest(
    val nodeId: String,
    val x: Double? = null,
    val y: Double? = null
)

val cloneNodeValidator = validator<CloneNodeRequest> { request ->
    validate(request.nodeId.isNotBlank(), "NodeId must not be blank")
}

/**
 * Set Text Content validation
 */
@Serializable
data class SetTextContentRequest(
    val nodeId: String,
    val text: String
)

val setTextContentValidator = validator<SetTextContentRequest> { request ->
    validate(request.nodeId.isNotBlank(), "NodeId must not be blank")
    validate(request.text.isNotBlank(), "Text must not be blank")
}

/**
 * Text Replacement for batch operations
 */
@Serializable
data class TextReplacement(
    val nodeId: String,
    val text: String
)

val textReplacementValidator = validator<TextReplacement> { replacement ->
    validate(replacement.nodeId.isNotBlank(), "NodeId must not be blank")
    validate(replacement.text.isNotBlank(), "Text must not be blank")
}

/**
 * Set Multiple Text Contents validation
 */
@Serializable
data class SetMultipleTextContentsRequest(
    val nodeId: String,
    val text: List<TextReplacement>
)

val setMultipleTextContentsValidator = validator<SetMultipleTextContentsRequest> { request ->
    validate(request.nodeId.isNotBlank(), "NodeId must not be blank")
    validate(request.text.isNotEmpty(), "Text replacements list must not be empty")
    validate(request.text.size <= 100, "Text replacements list must not exceed 100 items")
    
    request.text.forEachIndexed { index, replacement ->
        val replacementValidation = validate(replacement, textReplacementValidator)
        if (replacementValidation is ValidationResult.Error) {
            replacementValidation.errors.forEach { error ->
                validate(false, "Text replacement at index $index: $error")
            }
        }
    }
}

/**
 * Create Component Instance validation
 */
@Serializable
data class CreateComponentInstanceRequest(
    val componentKey: String,
    val x: Double,
    val y: Double
)

val createComponentInstanceValidator = validator<CreateComponentInstanceRequest> { request ->
    validate(request.componentKey.isNotBlank(), "Component key must not be blank")
}

/**
 * Export Node As Image validation
 */
@Serializable
data class ExportNodeAsImageRequest(
    val nodeId: String,
    val format: String? = null,
    val scale: Double? = null
)

val exportNodeAsImageValidator = validator<ExportNodeAsImageRequest> { request ->
    validate(request.nodeId.isNotBlank(), "NodeId must not be blank")
    request.format?.let { format ->
        validate(format in listOf("PNG", "JPG", "SVG", "PDF"), "Format must be one of: PNG, JPG, SVG, PDF")
    }
    request.scale?.let { scale ->
        validate(scale > 0.0, "Scale must be positive")
    }
}

 
