/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { CountTokensParameters, CountTokensResponse, EmbedContentParameters, EmbedContentResponse, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import { Config } from '../config/config.js';
import { ContentGenerator } from './contentGenerator.js';
interface StructuredError {
    status: number;
}
export declare function isStructuredError(error: unknown): error is StructuredError;
/**
 * A decorator that wraps a ContentGenerator to add logging to API calls.
 */
export declare class LoggingContentGenerator implements ContentGenerator {
    private readonly wrapped;
    private readonly config;
    constructor(wrapped: ContentGenerator, config: Config);
    private logApiRequest;
    private _logApiResponse;
    private _logApiError;
    generateContent(req: GenerateContentParameters, userPromptId: string): Promise<GenerateContentResponse>;
    generateContentStream(req: GenerateContentParameters, userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    private loggingStreamWrapper;
    countTokens(req: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(req: EmbedContentParameters): Promise<EmbedContentResponse>;
}
export {};
