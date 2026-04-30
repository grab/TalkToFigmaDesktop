/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  buildBundledRuntimeCandidates,
  getRuntimeBinaryFileName,
  resolveRuntimePlatformKey,
} from './runtimeBinary';

test('resolveRuntimePlatformKey returns expected key for supported platforms', () => {
  assert.equal(resolveRuntimePlatformKey('darwin', 'arm64'), 'darwin-arm64');
  assert.equal(resolveRuntimePlatformKey('darwin', 'x64'), 'darwin-x64');
  assert.equal(resolveRuntimePlatformKey('win32', 'x64'), 'windows-x64');
  assert.equal(resolveRuntimePlatformKey('win32', 'arm64'), 'windows-arm64');
});

test('getRuntimeBinaryFileName returns platform-specific executable name', () => {
  assert.equal(getRuntimeBinaryFileName('darwin'), 'llama-server');
  assert.equal(getRuntimeBinaryFileName('win32'), 'llama-server.exe');
});

test('buildBundledRuntimeCandidates only includes bundled locations', () => {
  const candidates = buildBundledRuntimeCandidates({
    appPath: '/app/root',
    resourcesPath: '/app/resources',
    platformKey: 'darwin-arm64',
    binaryFileName: 'llama-server',
  });

  assert.deepEqual(candidates, [
    path.join('/app/resources', 'llama', 'bin', 'darwin-arm64', 'llama-server'),
    path.join('/app/root', 'runtime', 'llama', 'bin', 'darwin-arm64', 'llama-server'),
  ]);
});
