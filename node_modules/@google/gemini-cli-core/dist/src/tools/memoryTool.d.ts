/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseTool, ToolResult, ToolEditConfirmationDetails } from './tools.js';
import { ModifiableDeclarativeTool, ModifyContext } from './modifiable-tool.js';
export declare const GEMINI_CONFIG_DIR = ".gemini";
export declare const DEFAULT_CONTEXT_FILENAME = "GEMINI.md";
export declare const MEMORY_SECTION_HEADER = "## Gemini Added Memories";
export declare function setGeminiMdFilename(newFilename: string | string[]): void;
export declare function getCurrentGeminiMdFilename(): string;
export declare function getAllGeminiMdFilenames(): string[];
interface SaveMemoryParams {
    fact: string;
    modified_by_user?: boolean;
    modified_content?: string;
}
export declare class MemoryTool extends BaseTool<SaveMemoryParams, ToolResult> implements ModifiableDeclarativeTool<SaveMemoryParams> {
    private static readonly allowlist;
    static readonly Name: string;
    constructor();
    getDescription(_params: SaveMemoryParams): string;
    /**
     * Reads the current content of the memory file
     */
    private readMemoryFileContent;
    /**
     * Computes the new content that would result from adding a memory entry
     */
    private computeNewContent;
    shouldConfirmExecute(params: SaveMemoryParams, _abortSignal: AbortSignal): Promise<ToolEditConfirmationDetails | false>;
    static performAddMemoryEntry(text: string, memoryFilePath: string, fsAdapter: {
        readFile: (path: string, encoding: 'utf-8') => Promise<string>;
        writeFile: (path: string, data: string, encoding: 'utf-8') => Promise<void>;
        mkdir: (path: string, options: {
            recursive: boolean;
        }) => Promise<string | undefined>;
    }): Promise<void>;
    execute(params: SaveMemoryParams, _signal: AbortSignal): Promise<ToolResult>;
    getModifyContext(_abortSignal: AbortSignal): ModifyContext<SaveMemoryParams>;
}
export {};
