/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.Launch
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import java.awt.Desktop
import java.net.URI
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
 * Data class for open source license information
 */
data class OpenSourceLicense(
    val name: String,
    val version: String,
    val license: String,
    val description: String,
    val url: String? = null
)

/**
 * Modern Material 3 design dialog for displaying open source licenses
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OpenSourceDialog(
    isVisible: Boolean,
    onDismiss: () -> Unit,
    analyticsService: kr.co.metadata.mcp.analytics.GoogleAnalyticsService? = null
) {
    if (isVisible) {
        val scope = rememberCoroutineScope()
        
        // Send analytics event when dialog opens
        LaunchedEffect(Unit) {
            scope.launch {
                analyticsService?.sendPageView(
                    pageTitle = "Open Source Licenses",
                    pageLocation = "https://mcp.metadata.co.kr/licenses",
                    pagePath = "/licenses"
                )
                logger.debug { "Open Source Licenses Dialog analytics sent" }
            }
        }
        
        val dialogState = rememberDialogState(
            position = WindowPosition.Aligned(Alignment.Center),
            width = 700.dp,
            height = 600.dp
        )
        
        DialogWindow(
            onCloseRequest = onDismiss,
            state = dialogState,
            title = "Open Source Licenses",
            alwaysOnTop = false,
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
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Header
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Code,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(28.dp)
                            )
                            
                            Column {
                                Text(
                                    text = "Open Source Software",
                                    style = MaterialTheme.typography.headlineSmall.copy(
                                        fontWeight = FontWeight.Medium
                                    ),
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Third-party libraries used in this application",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        
                        Divider(
                            color = MaterialTheme.colorScheme.outlineVariant,
                            thickness = 1.dp
                        )
                        
                        // License list
                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            items(getOpenSourceLicenses()) { license ->
                                LicenseListItem(
                                    license = license,
                                    onUrlClick = { url ->
                                        try {
                                            if (Desktop.isDesktopSupported()) {
                                                val desktop = Desktop.getDesktop()
                                                if (desktop.isSupported(Desktop.Action.BROWSE)) {
                                                    desktop.browse(URI(url))
                                                }
                                            }
                                        } catch (e: Exception) {
                                            logger.warn { "Failed to open URL: $url - ${e.message}" }
                                        }
                                    }
                                )
                            }
                        }
                        
                        Divider(
                            color = MaterialTheme.colorScheme.outlineVariant,
                            thickness = 1.dp
                        )
                        
                        // Footer with close button
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            FilledTonalButton(
                                onClick = onDismiss,
                                modifier = Modifier.widthIn(min = 120.dp)
                            ) {
                                Text(
                                    text = "Close",
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

@Composable
private fun LicenseListItem(
    license: OpenSourceLicense,
    onUrlClick: (String) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Left side - Library info
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // Library name and version
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = license.name,
                    style = MaterialTheme.typography.bodyLarge.copy(
                        fontWeight = FontWeight.Medium
                    ),
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                Text(
                    text = "v${license.version}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .background(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(4.dp)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
            
            // Description
            Text(
                text = license.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2
            )
        }
        
        // Middle - License type
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(horizontal = 8.dp)
        ) {
            Text(
                text = license.license,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .background(
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                        shape = RoundedCornerShape(6.dp)
                    )
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
        
        // Right side - URL button
        license.url?.let { url ->
            IconButton(
                onClick = { onUrlClick(url) },
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Launch,
                    contentDescription = "Open URL",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
    
    // Divider between items
    Divider(
        modifier = Modifier.padding(horizontal = 16.dp),
        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
        thickness = 0.5.dp
    )
}

/**
 * Returns the list of open source licenses used in this project
 */
private fun getOpenSourceLicenses(): List<OpenSourceLicense> {
    return listOf(
        OpenSourceLicense(
            name = "Kotlin Standard Library",
            version = "2.2.0",
            license = "Apache 2.0",
            description = "Kotlin runtime library and standard library",
            url = "https://github.com/JetBrains/kotlin"
        ),
        OpenSourceLicense(
            name = "Jetpack Compose for Desktop",
            version = "1.8.1",
            license = "Apache 2.0",
            description = "Modern toolkit for building native UI in Kotlin",
            url = "https://github.com/JetBrains/compose-multiplatform"
        ),
        OpenSourceLicense(
            name = "Kotlinx Serialization",
            version = "1.7.3",
            license = "Apache 2.0",
            description = "Kotlin multiplatform / multi-format serialization",
            url = "https://github.com/Kotlin/kotlinx.serialization"
        ),
        OpenSourceLicense(
            name = "Kotlinx Coroutines",
            version = "1.9.0",
            license = "Apache 2.0",
            description = "Library support for Kotlin coroutines",
            url = "https://github.com/Kotlin/kotlinx.coroutines"
        ),
        OpenSourceLicense(
            name = "MCP Kotlin SDK",
            version = "0.5.0",
            license = "MIT",
            description = "Model Context Protocol implementation for Kotlin",
            url = "https://github.com/modelcontextprotocol/kotlin-sdk"
        ),
        OpenSourceLicense(
            name = "Java-WebSocket",
            version = "1.5.3",
            license = "MIT",
            description = "Java WebSocket client and server implementation",
            url = "https://github.com/TooTallNate/Java-WebSocket"
        ),
        OpenSourceLicense(
            name = "Jackson",
            version = "2.15.2",
            license = "Apache 2.0",
            description = "High-performance JSON processor for Java",
            url = "https://github.com/FasterXML/jackson"
        ),
        OpenSourceLicense(
            name = "OkHttp",
            version = "4.12.0",
            license = "Apache 2.0",
            description = "HTTP client for Android and Java applications",
            url = "https://github.com/square/okhttp"
        ),
        OpenSourceLicense(
            name = "Logback",
            version = "1.4.11",
            license = "EPL 1.0, LGPL 2.1",
            description = "Reliable, generic, fast and flexible logging framework",
            url = "https://github.com/qos-ch/logback"
        ),
        OpenSourceLicense(
            name = "Kotlin Logging",
            version = "2.1.23",
            license = "Apache 2.0",
            description = "Lightweight logging framework for Kotlin",
            url = "https://github.com/MicroUtils/kotlin-logging"
        ),
        OpenSourceLicense(
            name = "Skiko",
            version = "0.8.4",
            license = "Apache 2.0",
            description = "Kotlin Multiplatform bindings to Skia",
            url = "https://github.com/JetBrains/skiko"
        ),
        OpenSourceLicense(
            name = "Typesafe Config",
            version = "1.4.2",
            license = "Apache 2.0",
            description = "Configuration library for JVM languages",
            url = "https://github.com/lightbend/config"
        ),
        OpenSourceLicense(
            name = "JSON in Java",
            version = "20231013",
            license = "JSON License",
            description = "Reference implementation of a JSON package in Java",
            url = "https://github.com/stleary/JSON-java"
        ),
        OpenSourceLicense(
            name = "Logstash Logback Encoder",
            version = "7.4",
            license = "Apache 2.0, MIT",
            description = "Logback encoder which creates JSON for Logstash",
            url = "https://github.com/logfellow/logstash-logback-encoder"
        )
    )
}
