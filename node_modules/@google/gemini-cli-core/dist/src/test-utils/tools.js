/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { vi } from 'vitest';
import { BaseTool, Icon, } from '../tools/tools.js';
import { Type } from '@google/genai';
/**
 * A highly configurable mock tool for testing purposes.
 */
export class MockTool extends BaseTool {
    executeFn = vi.fn();
    shouldConfirm = false;
    constructor(name = 'mock-tool', displayName, description = 'A mock tool for testing.', params = {
        type: Type.OBJECT,
        properties: { param: { type: Type.STRING } },
    }) {
        super(name, displayName ?? name, description, Icon.Hammer, params);
    }
    async execute(params, _abortSignal) {
        const result = this.executeFn(params);
        return (result ?? {
            llmContent: `Tool ${this.name} executed successfully.`,
            returnDisplay: `Tool ${this.name} executed successfully.`,
        });
    }
    async shouldConfirmExecute(_params, _abortSignal) {
        if (this.shouldConfirm) {
            return {
                type: 'exec',
                title: `Confirm ${this.displayName}`,
                command: this.name,
                rootCommand: this.name,
                onConfirm: async () => { },
            };
        }
        return false;
    }
}
//# sourceMappingURL=tools.js.map