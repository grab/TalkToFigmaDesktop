/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STORE_KEYS } from '../../shared/constants';
import type {
  AssistantInstalledModel,
  AssistantMessagePart,
  AssistantMessagePartTool,
  AssistantRunEvent,
  AssistantRunLog,
  ToolApprovalRequest,
} from '../../shared/types';
import { AssistantMessageSerializer } from './AssistantMessageSerializer';
import { AssistantRunExecutor } from './AssistantRunExecutor';
import { AssistantRuntimeSettings } from './AssistantRuntimeSettings';
import { AssistantThreadRepository, type AssistantKeyValueStore } from './AssistantThreadRepository';
import { ExceedContextSizeError } from './AssistantErrors';
import type { LlamaToolCall, LlamaToolDefinition } from './AssistantLlamaTypes';

interface TestExecuteToolCallOptions {
  runId: string;
  assistantParts: AssistantMessagePart[];
  toolCall: LlamaToolCall & { id: string };
  runDedupeSet?: Set<string>;
  requestApproval: (request: ToolApprovalRequest) => Promise<boolean>;
  emitToolPartEvent: (runId: string, part: AssistantMessagePartTool) => void;
  logRunToolCall: (runId: string, toolCall: AssistantRunLog['toolCalls'][number]) => void;
  updateRunToolCallApproval: (runId: string, toolCallId: string, approved: boolean) => void;
  updateRunToolCallResult: (runId: string, toolCallId: string, ok: boolean) => void;
}

const installedModel: AssistantInstalledModel = {
  id: 'model-a',
  displayName: 'Model A',
  version: '1',
  source: 'download',
  supportsVision: false,
  modelPath: '/tmp/model.gguf',
  modelSha256: 'sha',
  modelSizeBytes: 1,
  installedAt: 1,
};

function createMemoryStore(initial?: Record<string, unknown>): AssistantKeyValueStore {
  const values = new Map<string, unknown>(Object.entries(initial ?? {}));
  return {
    get: (key) => values.get(key),
    set: (key, value) => {
      values.set(key, value);
    },
  };
}

function createExecutor({
  runtime,
  events,
  requestToolApproval,
  store,
}: {
  runtime: any;
  events: AssistantRunEvent[];
  requestToolApproval?: (request: ToolApprovalRequest) => void;
  store?: AssistantKeyValueStore;
}) {
  const resolvedStore = store ?? createMemoryStore();
  const repository = new AssistantThreadRepository(() => resolvedStore);
  const thread = repository.createThread('Thread');
  repository.appendMessage({
    id: 'user-1',
    threadId: thread.id,
    role: 'user',
    createdAt: 1,
    parts: [{ type: 'text', text: 'hello' }],
  });

  const settings = new AssistantRuntimeSettings(
    <T>(key: string) => resolvedStore.get(key) as T | undefined,
    <T>(key: string, value: T) => {
      resolvedStore.set(key, value);
    },
  );
  const serializer = new AssistantMessageSerializer(() => settings.getHistoryToolResultLimit());
  const toolExecutor = createTestToolExecutor(serializer);
  const executor = new AssistantRunExecutor({
    modelLookup: {
      getInstalledModelById: () => installedModel,
    },
    runtime,
    repository,
    serializer,
    toolExecutor,
    settings,
    emitRunEvent: (event) => events.push(event),
    requestToolApproval: requestToolApproval ?? (() => undefined),
  });

  return { executor, repository, thread };
}

function createTestToolExecutor(serializer: AssistantMessageSerializer) {
  return {
    buildLlamaTools(): LlamaToolDefinition[] {
      return [];
    },

    async executeToolCall(options: TestExecuteToolCallOptions) {
      const {
        runId,
        assistantParts,
        toolCall,
        runDedupeSet,
        requestApproval,
        emitToolPartEvent,
        logRunToolCall,
        updateRunToolCallApproval,
        updateRunToolCallResult,
      } = options;
      const toolName = toolCall.function?.name?.trim() ?? '';
      const toolCallId = toolCall.id;
      const args = parseArgs(toolCall.function?.arguments);
      const safety = toolName === 'create_rectangle' ? 'write' : 'read';
      const emitPart = (state: AssistantMessagePartTool['state'], result?: unknown, errorText?: string) => {
        const part = serializer.upsertToolPart(assistantParts, {
          toolName,
          toolCallId,
          safety,
          state,
          input: args,
          ...(result !== undefined ? { output: result } : {}),
          ...(errorText ? { errorText } : {}),
        });
        emitToolPartEvent(runId, part);
        return part;
      };

      logRunToolCall(runId, {
        toolCallId,
        toolName,
        args,
        safety,
      });

      emitPart('input-available');

      const dedupeKey = `${toolName}:${stableStringify(args)}`;
      if (runDedupeSet?.has(dedupeKey)) {
        const duplicateResult = {
          status: 'duplicate_tool_call_blocked',
          message: 'The same tool call was already attempted in this run.',
          toolName,
        };
        emitPart('output-error', duplicateResult, duplicateResult.message);
        updateRunToolCallResult(runId, toolCallId, false);
        return duplicateResult;
      }
      runDedupeSet?.add(dedupeKey);

      if (safety === 'write') {
        const approved = await requestApproval(createApprovalRequest(runId, toolCallId, toolName, args, safety));
        updateRunToolCallApproval(runId, toolCallId, approved);

        if (!approved) {
          const deniedResult = {
            status: 'tool_execution_rejected',
            message: 'tool execution rejected',
            toolName,
          };
          emitPart('output-error', deniedResult, deniedResult.message);
          updateRunToolCallResult(runId, toolCallId, false);
          return deniedResult;
        }
      }

      const result = { ok: true, toolName, args };
      emitPart('output-available', result);
      updateRunToolCallResult(runId, toolCallId, true);
      return result;
    },
  };
}

function createApprovalRequest(
  runId: string,
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>,
  safety: 'read' | 'write',
): ToolApprovalRequest {
  return {
    runId,
    threadId: 'thread',
    toolCallId,
    toolName,
    args,
    safety,
    requestedAt: Date.now(),
  };
}

function parseArgs(rawArguments: string | undefined): Record<string, unknown> {
  if (!rawArguments?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawArguments);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`);
  return `{${entries.join(',')}}`;
}

test('AssistantRunExecutor streams tokens and persists final assistant message', async () => {
  const events: AssistantRunEvent[] = [];
  const runtime = {
    ensureStarted: async () => ({ success: true }),
    getRuntimeModelName: () => 'local-model',
    chatCompletions: async (_payload: unknown, _signal: AbortSignal, onTextDelta?: (textDelta: string) => void) => {
      onTextDelta?.('Hello');
      return { choices: [{ message: { content: '' } }] };
    },
  };
  const { executor, repository, thread } = createExecutor({ runtime, events });

  await executor.run({ runId: 'run-1', threadId: thread.id, modelId: installedModel.id });

  const messages = repository.getMessagesForThread(thread.id);
  assert.equal(messages.at(-1)?.role, 'assistant');
  assert.deepEqual(messages.at(-1)?.parts, [{ type: 'text', text: 'Hello' }]);
  assert.equal(events.some((event) => event.type === 'token' && event.textDelta === 'Hello'), true);
  assert.equal(events.at(-1)?.type, 'run-end');
});

test('AssistantRunExecutor retries once with a larger context window', async () => {
  const events: AssistantRunEvent[] = [];
  const store = createMemoryStore({
    [STORE_KEYS.ASSISTANT_CONTEXT_LENGTH]: 4096,
  });
  let calls = 0;
  const runtime = {
    ensureStarted: async () => ({ success: true }),
    getRuntimeModelName: () => 'local-model',
    chatCompletions: async () => {
      calls += 1;
      if (calls === 1) {
        throw new ExceedContextSizeError('too large', 7000, 4096);
      }
      return { choices: [{ message: { content: 'Recovered' } }] };
    },
  };
  const { executor, repository, thread } = createExecutor({ runtime, events, store });

  await executor.run({ runId: 'run-1', threadId: thread.id, modelId: installedModel.id });

  assert.equal(calls, 2);
  assert.equal(store.get(STORE_KEYS.ASSISTANT_CONTEXT_LENGTH), 16384);
  assert.equal(repository.getMessagesForThread(thread.id).at(-1)?.parts[0]?.type, 'text');
});

test('AssistantRunExecutor blocks duplicate tool calls in a single run', async () => {
  const events: AssistantRunEvent[] = [];
  let calls = 0;
  const runtime = {
    ensureStarted: async () => ({ success: true }),
    getRuntimeModelName: () => 'local-model',
    chatCompletions: async () => {
      calls += 1;
      if (calls === 1) {
        return {
          choices: [{
            message: {
              content: '',
              tool_calls: [
                { id: 'tool-a', type: 'function', function: { name: 'unknown_tool', arguments: '{"x":1}' } },
                { id: 'tool-b', type: 'function', function: { name: 'unknown_tool', arguments: '{"x":1}' } },
              ],
            },
          }],
        };
      }
      return { choices: [{ message: { content: 'Done' } }] };
    },
  };
  const { executor, repository, thread } = createExecutor({ runtime, events });

  await executor.run({ runId: 'run-1', threadId: thread.id, modelId: installedModel.id });

  const assistantMessage = repository.getMessagesForThread(thread.id).at(-1);
  assert.equal(JSON.stringify(assistantMessage?.parts).includes('duplicate_tool_call_blocked'), true);
});

test('AssistantRunExecutor supports rejecting write tool approvals', async () => {
  const events: AssistantRunEvent[] = [];
  let calls = 0;
  let capturedRequest: ToolApprovalRequest | null = null;
  let releaseApprovalRequest: (() => void) | null = null;
  const approvalRequested = new Promise<void>((resolve) => {
    releaseApprovalRequest = resolve;
  });
  const runtime = {
    ensureStarted: async () => ({ success: true }),
    getRuntimeModelName: () => 'local-model',
    chatCompletions: async () => {
      calls += 1;
      if (calls === 1) {
        return {
          choices: [{
            message: {
              content: '',
              tool_calls: [
                {
                  id: 'tool-write',
                  type: 'function',
                  function: {
                    name: 'create_rectangle',
                    arguments: '{"x":0,"y":0,"width":10,"height":10}',
                  },
                },
              ],
            },
          }],
        };
      }
      return { choices: [{ message: { content: 'Rejected and continued' } }] };
    },
  };
  const { executor, repository, thread } = createExecutor({
    runtime,
    events,
    requestToolApproval: (request) => {
      capturedRequest = request;
      releaseApprovalRequest?.();
    },
  });

  const runPromise = executor.run({ runId: 'run-1', threadId: thread.id, modelId: installedModel.id });
  await approvalRequested;
  const approvalRequest = capturedRequest as ToolApprovalRequest | null;
  assert.ok(approvalRequest);
  executor.rejectToolCall(approvalRequest.runId, approvalRequest.toolCallId);
  await runPromise;

  assert.equal(JSON.stringify(repository.getMessagesForThread(thread.id).at(-1)?.parts).includes('tool_execution_rejected'), true);
});
