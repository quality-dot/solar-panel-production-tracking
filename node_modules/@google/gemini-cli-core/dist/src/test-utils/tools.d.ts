/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseTool, ToolCallConfirmationDetails, ToolResult } from '../tools/tools.js';
import { Schema } from '@google/genai';
/**
 * A highly configurable mock tool for testing purposes.
 */
export declare class MockTool extends BaseTool<{
    [key: string]: unknown;
}, ToolResult> {
    executeFn: import("vitest").Mock<(...args: any[]) => any>;
    shouldConfirm: boolean;
    constructor(name?: string, displayName?: string, description?: string, params?: Schema);
    execute(params: {
        [key: string]: unknown;
    }, _abortSignal: AbortSignal): Promise<ToolResult>;
    shouldConfirmExecute(_params: {
        [key: string]: unknown;
    }, _abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false>;
}
