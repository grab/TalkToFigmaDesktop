/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp.ui

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Launch
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogWindow
import androidx.compose.ui.window.DialogState
import androidx.compose.ui.window.WindowPosition
import androidx.compose.ui.window.rememberDialogState
import androidx.compose.ui.layout.ContentScale
import androidx.compose.foundation.Image
import androidx.compose.ui.graphics.toComposeImageBitmap
import androidx.compose.ui.awt.SwingPanel
import mu.KotlinLogging
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
import org.jetbrains.skia.Data
import org.jetbrains.skia.Image as SkiaImage
import org.jetbrains.skia.Codec
import org.jetbrains.skia.Bitmap
import java.awt.Canvas
import java.awt.Graphics
import java.awt.Graphics2D
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import javax.swing.Timer
import java.io.InputStream

private val logger = KotlinLogging.logger {}

@Composable
fun WebPAnimationViewer(
    resourcePath: String,
    modifier: Modifier = Modifier,
    contentDescription: String? = null
) {
    var currentFrameIndex by remember(resourcePath) { mutableStateOf(0) }
    var animationFrames by remember(resourcePath) { mutableStateOf<List<androidx.compose.ui.graphics.ImageBitmap>>(emptyList()) }
    var isLoading by remember(resourcePath) { mutableStateOf(true) }
    
    // Load WebP animation frames
    LaunchedEffect(resourcePath) {
        try {
            val resourceStream = javaClass.classLoader.getResourceAsStream(resourcePath)
            if (resourceStream != null) {
                val data = Data.makeFromBytes(resourceStream.readBytes())
                val codec = Codec.makeFromData(data)
                
                if (codec != null && codec.frameCount > 0) {
                    val frames = mutableListOf<androidx.compose.ui.graphics.ImageBitmap>()
                    
                    // Extract each frame from the WebP animation
                    for (frameIndex in 0 until codec.frameCount) {
                        try {
                            val bitmap = Bitmap()
                            if (bitmap.allocN32Pixels(codec.width, codec.height)) {
                                // Read pixels for this frame
                                codec.readPixels(bitmap, frameIndex)
                                val skiaImage = SkiaImage.makeFromBitmap(bitmap)
                                frames.add(skiaImage.toComposeImageBitmap())
                                logger.debug { "Extracted frame $frameIndex from WebP: $resourcePath" }
                            }
                        } catch (e: Exception) {
                            logger.warn(e) { "Failed to extract frame $frameIndex from WebP: $resourcePath" }
                        }
                    }
                    
                    if (frames.isNotEmpty()) {
                        animationFrames = frames
                        logger.info { "Loaded ${frames.size} frames from WebP animation: $resourcePath" }
                    } else {
                        // Fallback to single image
                        val skiaImage = SkiaImage.makeFromEncoded(data.bytes)
                        if (skiaImage != null) {
                            animationFrames = listOf(skiaImage.toComposeImageBitmap())
                            logger.info { "Loaded WebP as static image: $resourcePath" }
                        }
                    }
                    
                    isLoading = false
                } else {
                    logger.error { "Failed to create codec or no frames in WebP: $resourcePath" }
                    isLoading = false
                }
            } else {
                logger.error { "Resource not found: $resourcePath" }
                isLoading = false
            }
        } catch (e: Exception) {
            logger.error(e) { "Error loading WebP animation: $resourcePath" }
            isLoading = false
        }
    }
    
    // Animation timer - only animate if we have multiple frames and loading is complete
    LaunchedEffect(animationFrames, isLoading) {
        if (animationFrames.size > 1 && !isLoading) {
            // Reset to first frame when starting new animation
            currentFrameIndex = 0
            while (true) {
                delay(50) // 50ms per frame (20 FPS) for smooth animation
                currentFrameIndex = (currentFrameIndex + 1) % animationFrames.size
            }
        }
    }
    
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        when {
            isLoading -> {
                CircularProgressIndicator()
            }
            animationFrames.isNotEmpty() -> {
                Image(
                    bitmap = animationFrames[currentFrameIndex],
                    contentDescription = contentDescription,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Fit
                )
            }
            else -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Warning",
                        tint = Color(0xFFFFA500),
                        modifier = Modifier.size(48.dp)
                    )
                    Text(
                        text = "Failed to load WebP animation",
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TutorialDialog(
    isVisible: Boolean,
    onDismiss: () -> Unit,
    analyticsService: kr.co.metadata.mcp.analytics.GoogleAnalyticsService? = null
) {
    if (isVisible) {
        val dialogState = rememberDialogState(
            position = WindowPosition.Aligned(Alignment.Center),
            width = 780.dp,
            height = 750.dp
        )
        
        DialogWindow(
            onCloseRequest = onDismiss,
            state = dialogState,
            title = "Getting Started Tutorial",
            alwaysOnTop = true,
            focusable = true
        ) {
            val isDarkTheme = isSystemInDarkTheme()
            val uriHandler = LocalUriHandler.current
            val scope = rememberCoroutineScope()
            var currentVideoIndex by remember { mutableStateOf(0) }
            
            // WebP 애니메이션 파일 경로 목록
            val videoTutorials = listOf(
                TutorialVideo(
                    title = "Step 1: Open MCP Configuration",
                    description = "Go to MCP Configuration menu from the tray and copy the MCP server addresses",
                    webpPath = "tutorials/tutorial01.webp"
                ),
                TutorialVideo(
                    title = "Step 2: Configure IDE",
                    description = "In Cursor IDE, go to Settings → Tools & Integrations and paste the MCP server JSON configuration",
                    webpPath = "tutorials/tutorial02.webp"
                ),
                TutorialVideo(
                    title = "Step 3: Start Services",
                    description = "Click \"Start Services\" in the tray menu and ensure Tools are enabled in MCP settings",
                    webpPath = "tutorials/tutorial03.webp"
                ),
                TutorialVideo(
                    title = "Step 4: Run Figma Plugin",
                    description = "Find and run the Cursor Talk To Figma plugin in Figma",
                    webpPath = "tutorials/tutorial04.webp"
                ),
                TutorialVideo(
                    title = "Step 5: Connect to Desktop",
                    description = "Toggle \"Use Localhost\" on and click Connect button to establish connection",
                    webpPath = "tutorials/tutorial05.webp"
                )
            )
            
            val totalVideos = videoTutorials.size
            
            // Send analytics event when step changes
            LaunchedEffect(currentVideoIndex) {
                val currentTutorial = videoTutorials[currentVideoIndex]
                scope.launch {
                    analyticsService?.sendPageView(
                        pageTitle = currentTutorial.title,
                        pageLocation = "https://mcp.metadata.co.kr/tutorial/step${currentVideoIndex + 1}",
                        pagePath = "/tutorial/step${currentVideoIndex + 1}"
                    )
                    logger.debug { "Tutorial step analytics sent: ${currentTutorial.title}" }
                }
            }
            
            // Removed auto-advance timer - let users control their own pace

            MaterialTheme(
                colorScheme = if (isDarkTheme) darkColorScheme() else lightColorScheme()
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = if (isDarkTheme) Color(0xFF1E1E1E) else Color(0xFFFAFAFA)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Header with close button
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = videoTutorials[currentVideoIndex].title,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isDarkTheme) Color.White else Color(0xFF333333)
                            )
                            
                            // Close button
                            IconButton(onClick = onDismiss) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Close tutorial",
                                    tint = if (isDarkTheme) Color.White else Color(0xFF333333)
                                )
                            }
                        }

                        // Progress indicator with description
                        Column(
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            LinearProgressIndicator(
                                progress = { (currentVideoIndex + 1) / totalVideos.toFloat() },
                                modifier = Modifier.fillMaxWidth(),
                                color = if (isDarkTheme) Color(0xFF64B5F6) else Color(0xFF1976D2)
                            )
                            Text(
                                text = videoTutorials[currentVideoIndex].description,
                                fontSize = 14.sp,
                                lineHeight = 20.sp,
                                color = if (isDarkTheme) Color(0xFFE0E0E0) else Color(0xFF424242)
                            )
                        }

                        // WebP Animation display card
                        OutlinedCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            colors = CardDefaults.outlinedCardColors(
                                containerColor = if (isDarkTheme) Color(0xFF2D2D2D) else Color.White
                            ),
                            border = CardDefaults.outlinedCardBorder(
                                enabled = true
                            )
                        ) {
                            // WebP Animation section
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(8.dp)
                                    .clip(RoundedCornerShape(8.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                val currentWebpPath = videoTutorials[currentVideoIndex].webpPath
                                
                                // WebP 애니메이션 표시 (Skiko 기반)
                                // key를 사용해서 스텝이 바뀔 때마다 컴포넌트 완전 재생성
                                key(currentVideoIndex) {
                                    WebPAnimationViewer(
                                        resourcePath = currentWebpPath,
                                        contentDescription = "Tutorial ${currentVideoIndex + 1}",
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                            }
                        }

                        // Bottom action area (80dp height for all steps)
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(80.dp)
                        ) {
                            // Figma Plugin link only for Step 4
                            if (currentVideoIndex == 3) {
                                OutlinedCard(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.outlinedCardColors(
                                        containerColor = if (isDarkTheme) Color(0xFF1A1A1A) else Color(0xFFF5F5F5)
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "Cursor Talk To Figma Plugin",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = if (isDarkTheme) Color.White else Color.Black
                                        )
                                        
                                        OutlinedButton(
                                            onClick = {
                                                try {
                                                    uriHandler.openUri("https://www.figma.com/community/plugin/1485687494525374295/cursor-talk-to-figma-mcp-plugin")
                                                    logger.info { "Opened Figma plugin page" }
                                                } catch (e: Exception) {
                                                    logger.error(e) { "Failed to open Figma plugin page" }
                                                }
                                            },
                                            colors = ButtonDefaults.outlinedButtonColors(
                                                contentColor = if (isDarkTheme) Color(0xFF64B5F6) else Color(0xFF1976D2)
                                            )
                                        ) {
                                            Icon(
                                                imageVector = Icons.AutoMirrored.Filled.Launch,
                                                contentDescription = null,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text("Open")
                                        }
                                    }
                                }
                            }
                        }

                        // Navigation buttons
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Previous button (always visible for layout consistency)
                            OutlinedButton(
                                onClick = { 
                                    if (currentVideoIndex > 0) {
                                        currentVideoIndex--
                                    }
                                },
                                enabled = currentVideoIndex > 0,
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = if (isDarkTheme) Color.White else Color(0xFF666666),
                                    disabledContentColor = if (isDarkTheme) Color.Gray.copy(alpha = 0.5f) else Color.Gray.copy(alpha = 0.7f)
                                )
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Previous")
                            }

                            // Step indicator dots
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                repeat(totalVideos) { index ->
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .background(
                                                if (index == currentVideoIndex) {
                                                    if (isDarkTheme) Color(0xFF64B5F6) else Color(0xFF1976D2)
                                                } else {
                                                    Color.Gray.copy(alpha = 0.3f)
                                                },
                                                androidx.compose.foundation.shape.CircleShape
                                            )
                                            .clickable { 
                                                currentVideoIndex = index
                                            }
                                    )
                                }
                            }

                            // Next/Finish button
                            Button(
                                onClick = {
                                    if (currentVideoIndex < totalVideos - 1) {
                                        currentVideoIndex++
                                    } else {
                                        onDismiss()
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isDarkTheme) Color(0xFF64B5F6) else Color(0xFF1976D2)
                                )
                            ) {
                                Text(if (currentVideoIndex < totalVideos - 1) "Next" else "Finish")
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(
                                    imageVector = if (currentVideoIndex < totalVideos - 1) Icons.AutoMirrored.Filled.ArrowForward else Icons.Default.Check,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

data class TutorialVideo(
    val title: String,
    val description: String,
    val webpPath: String
)

@Composable
fun SelectableText(
    text: String,
    modifier: Modifier = Modifier,
    style: androidx.compose.ui.text.TextStyle = LocalTextStyle.current
) {
    androidx.compose.foundation.text.selection.SelectionContainer {
        Text(
            text = text,
            modifier = modifier,
            style = style
        )
    }
}
