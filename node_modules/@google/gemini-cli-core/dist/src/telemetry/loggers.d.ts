/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
import { ApiErrorEvent, ApiRequestEvent, ApiResponseEvent, IdeConnectionEvent, StartSessionEvent, ToolCallEvent, UserPromptEvent, FlashFallbackEvent, NextSpeakerCheckEvent, LoopDetectedEvent, SlashCommandEvent } from './types.js';
export declare function logCliConfiguration(config: Config, event: StartSessionEvent): void;
export declare function logUserPrompt(config: Config, event: UserPromptEvent): void;
export declare function logToolCall(config: Config, event: ToolCallEvent): void;
export declare function logApiRequest(config: Config, event: ApiRequestEvent): void;
export declare function logFlashFallback(config: Config, event: FlashFallbackEvent): void;
export declare function logApiError(config: Config, event: ApiErrorEvent): void;
export declare function logApiResponse(config: Config, event: ApiResponseEvent): void;
export declare function logLoopDetected(config: Config, event: LoopDetectedEvent): void;
export declare function logNextSpeakerCheck(config: Config, event: NextSpeakerCheckEvent): void;
export declare function logSlashCommand(config: Config, event: SlashCommandEvent): void;
export declare function logIdeConnection(config: Config, event: IdeConnectionEvent): void;
