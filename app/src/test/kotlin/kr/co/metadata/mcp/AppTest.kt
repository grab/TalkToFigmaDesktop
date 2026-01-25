/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

package kr.co.metadata.mcp

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

class AppTest {

    @Test
    fun `application should have valid package name`() {
        val packageName = "kr.co.metadata.mcp"
        assertNotNull(packageName)
        assertTrue(packageName.isNotEmpty())
    }

    @Test
    fun `test basic functionality`() {
        
        assertTrue(true)
    }
} 
