/**
 * Talk to Figma Skill - Types
 *
 * Type definitions for the dynamic Figma control system.
 */
/**
 * Result of executing Figma Plugin API code
 */
export interface ExecutionResult {
    success: boolean;
    data?: unknown;
    error?: string;
}
/**
 * WebSocket message types
 */
export interface FigmaMessage {
    type: 'join' | 'message' | 'system' | 'error';
    id?: string;
    channel?: string;
    message?: unknown;
    result?: unknown;
    error?: string;
}
/**
 * Command to send to Figma plugin
 */
export interface FigmaCommand {
    type: string;
    params?: Record<string, unknown>;
}
/**
 * Options for code execution
 */
export interface ExecuteOptions {
    timeout?: number;
    retries?: number;
}
/**
 * Figma node types
 */
export type FigmaNodeType = 'DOCUMENT' | 'PAGE' | 'FRAME' | 'GROUP' | 'SECTION' | 'COMPONENT' | 'COMPONENT_SET' | 'INSTANCE' | 'BOOLEAN_OPERATION' | 'VECTOR' | 'STAR' | 'LINE' | 'ELLIPSE' | 'POLYGON' | 'RECTANGLE' | 'TEXT' | 'SLICE' | 'CONNECTOR' | 'STICKY' | 'SHAPE_WITH_TEXT' | 'CODE_BLOCK' | 'STAMP' | 'WIDGET' | 'EMBED' | 'LINK_UNFURL' | 'MEDIA' | 'HIGHLIGHT' | 'WASHI_TAPE' | 'TABLE' | 'TABLE_CELL';
/**
 * Basic node info returned from Figma
 */
export interface FigmaNodeInfo {
    id: string;
    name: string;
    type: FigmaNodeType;
    visible?: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}
/**
 * Color in Figma format (0-1 range)
 */
export interface FigmaColor {
    r: number;
    g: number;
    b: number;
    a?: number;
}
/**
 * Auto-layout settings
 */
export interface AutoLayoutSettings {
    layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
    layoutWrap?: 'NO_WRAP' | 'WRAP';
    primaryAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
    counterAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE';
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    itemSpacing?: number;
    counterAxisSpacing?: number;
}
/**
 * Code generation context
 */
export interface CodeGenContext {
    intent: string;
    nodeIds?: string[];
    parameters?: Record<string, unknown>;
}
/**
 * Generated code with metadata
 */
export interface GeneratedCode {
    code: string;
    description: string;
    expectedResult?: string;
}
//# sourceMappingURL=types.d.ts.map