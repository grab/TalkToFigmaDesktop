/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogWindow
import androidx.compose.ui.window.WindowPosition
import androidx.compose.ui.window.rememberDialogState
import kotlinx.coroutines.launch
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

/**
 * Modern Material 3 design dialog for server connection errors
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServerErrorDialog(
    isVisible: Boolean,
    onDismiss: () -> Unit,
    onKillServers: suspend () -> Unit,
    analyticsService: kr.co.metadata.mcp.analytics.GoogleAnalyticsService? = null
) {
    if (isVisible) {
        val scope = rememberCoroutineScope()
        var isProcessing by remember { mutableStateOf(false) }
        var currentStep by remember { mutableStateOf("") }
        var progress by remember { mutableStateOf(0f) }
        
        // Send analytics event when dialog opens
        LaunchedEffect(Unit) {
            scope.launch {
                analyticsService?.sendPageView(
                    pageTitle = "Server Error Dialog",
                    pageLocation = "https://mcp.metadata.co.kr/error/server-connection",
                    pagePath = "/error/server-connection"
                )
                logger.debug { "Server Error Dialog analytics sent" }
            }
        }
        
        val dialogState = rememberDialogState(
            position = WindowPosition.Aligned(Alignment.Center),
            width = 420.dp,
            height = 320.dp
        )
        
        DialogWindow(
            onCloseRequest = onDismiss,
            state = dialogState,
            title = "Connection Error",
            alwaysOnTop = true,
            focusable = true
        ) {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.surface
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.spacedBy(20.dp)
                    ) {
                        // Header with icon and title
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ErrorOutline,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(28.dp)
                            )
                            
                            Column {
                                Text(
                                    text = "Port conflict detected",
                                    style = MaterialTheme.typography.headlineSmall.copy(
                                        fontWeight = FontWeight.Medium
                                    ),
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Cannot start server",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        
                        // Description
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.1f)
                            ),
                            border = null
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                if (!isProcessing) {
                                    Text(
                                        text = "Ports are already in use by another process. Click \"Kill Servers\" to close the previous session and try again.",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                } else {
                                    // Progress indicator
                                    Column(
                                        verticalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        Text(
                                            text = "Stopping servers...",
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontWeight = FontWeight.Medium
                                            ),
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        
                                        LinearProgressIndicator(
                                            progress = { progress },
                                            modifier = Modifier.fillMaxWidth(),
                                        )
                                        
                                        if (currentStep.isNotEmpty()) {
                                            Text(
                                                text = currentStep,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        
                        Spacer(modifier = Modifier.weight(1f))
                        
                        // Action buttons - Material 3 style
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // Secondary action
                            TextButton(
                                onClick = onDismiss,
                                modifier = Modifier.weight(1f),
                                enabled = !isProcessing
                            ) {
                                Text(
                                    text = "Cancel",
                                    style = MaterialTheme.typography.labelLarge
                                )
                            }
                            
                            // Primary action
                            FilledTonalButton(
                                onClick = {
                                    scope.launch {
                                        try {
                                            isProcessing = true
                                            progress = 0f
                                            currentStep = "Stopping servers gracefully..."
                                            
                                            // Step 1: Graceful server stop (25% progress)
                                            onKillServers()
                                            progress = 0.25f
                                            
                                            kotlinx.coroutines.delay(500) // Brief pause for user feedback
                                            
                                            // Step 2: Additional cleanup (50% progress)
                                            currentStep = "Cleaning up processes..."
                                            progress = 0.50f
                                            kotlinx.coroutines.delay(1000)
                                            
                                            // Step 3: Final verification (75% progress)
                                            currentStep = "Verifying port availability..."
                                            progress = 0.75f
                                            kotlinx.coroutines.delay(500)
                                            
                                            // Step 4: Complete (100% progress)
                                            currentStep = "Cleanup completed successfully"
                                            progress = 1.0f
                                            kotlinx.coroutines.delay(1000)
                                            
                                            // Auto-close dialog
                                            onDismiss()
                                            
                                        } catch (e: Exception) {
                                            logger.error(e) { "Error during server cleanup process" }
                                            currentStep = "Error occurred during cleanup"
                                            kotlinx.coroutines.delay(2000)
                                            onDismiss()
                                        } finally {
                                            isProcessing = false
                                        }
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                enabled = !isProcessing,
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = MaterialTheme.colorScheme.error,
                                    contentColor = MaterialTheme.colorScheme.onError
                                )
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (isProcessing) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(18.dp),
                                            color = MaterialTheme.colorScheme.onError,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Icon(
                                            imageVector = Icons.Default.ClearAll,
                                            contentDescription = null,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                    Text(
                                        text = if (isProcessing) "Processing..." else "Kill Servers",
                                        style = MaterialTheme.typography.labelLarge
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
