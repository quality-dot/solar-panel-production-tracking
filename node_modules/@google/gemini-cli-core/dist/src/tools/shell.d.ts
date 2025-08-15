/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
import { BaseTool, ToolResult, ToolCallConfirmationDetails } from './tools.js';
export declare const OUTPUT_UPDATE_INTERVAL_MS = 1000;
export interface ShellToolParams {
    command: string;
    description?: string;
    directory?: string;
}
export declare class ShellTool extends BaseTool<ShellToolParams, ToolResult> {
    private readonly config;
    static Name: string;
    private allowlist;
    constructor(config: Config);
    getDescription(params: ShellToolParams): string;
    validateToolParams(params: ShellToolParams): string | null;
    shouldConfirmExecute(params: ShellToolParams, _abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false>;
    execute(params: ShellToolParams, signal: AbortSignal, updateOutput?: (output: string) => void): Promise<ToolResult>;
}
