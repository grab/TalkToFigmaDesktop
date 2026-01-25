/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.analytics

import mu.KotlinLogging

/**
 * Simple crash handler - will be implemented later
 * For now, just basic logging
 */
class CrashHandler(private val analytics: GoogleAnalyticsService? = null) {
    private val logger = KotlinLogging.logger {}
    
    init {
        logger.info { "Crash handler initialized (basic logging only)" }
    }
    
    /**
     * Handle uncaught exceptions - basic implementation
     */
    fun handleException(thread: Thread, exception: Throwable) {
        logger.error(exception) { "Uncaught exception in thread ${thread.name}" }
        try {
            val topFrame = exception.stackTrace.firstOrNull()?.let { f ->
                "${f.className}.${f.methodName}(${f.fileName}:${f.lineNumber})"
            }
            analytics?.sendAppException(
                fatal = true,
                exceptionType = exception::class.java.simpleName,
                exceptionMessage = exception.message,
                threadName = thread.name,
                stacktraceTop = topFrame
            )
        } catch (e: Exception) {
            logger.warn(e) { "Failed to send app_exception event" }
        }
    }
    
    /**
     * Clean up resources
     */
    fun cleanup() {
        logger.info { "Crash handler cleaned up" }
    }
}
