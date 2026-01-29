/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

/**
 * Prompt Registry - Shared prompt definitions for both SSE and stdio servers
 * Re-exports prompts from the main prompts module for reusability
 */

export { allPrompts, promptContents, type PromptDefinition } from '../prompts';
