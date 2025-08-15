/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { OAuth2Client } from 'google-auth-library';
import { CodeAssistGlobalUserSettingResponse, LoadCodeAssistRequest, LoadCodeAssistResponse, LongRunningOperationResponse, OnboardUserRequest, SetCodeAssistGlobalUserSettingRequest } from './types.js';
import { CountTokensParameters, CountTokensResponse, EmbedContentParameters, EmbedContentResponse, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import { ContentGenerator } from '../core/contentGenerator.js';
import { UserTierId } from './types.js';
/** HTTP options to be used in each of the requests. */
export interface HttpOptions {
    /** Additional HTTP headers to be sent with the request. */
    headers?: Record<string, string>;
}
export declare const CODE_ASSIST_ENDPOINT = "https://cloudcode-pa.googleapis.com";
export declare const CODE_ASSIST_API_VERSION = "v1internal";
export declare class CodeAssistServer implements ContentGenerator {
    readonly client: OAuth2Client;
    readonly projectId?: string | undefined;
    readonly httpOptions: HttpOptions;
    readonly sessionId?: string | undefined;
    readonly userTier?: UserTierId | undefined;
    constructor(client: OAuth2Client, projectId?: string | undefined, httpOptions?: HttpOptions, sessionId?: string | undefined, userTier?: UserTierId | undefined);
    generateContentStream(req: GenerateContentParameters, userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    generateContent(req: GenerateContentParameters, userPromptId: string): Promise<GenerateContentResponse>;
    onboardUser(req: OnboardUserRequest): Promise<LongRunningOperationResponse>;
    loadCodeAssist(req: LoadCodeAssistRequest): Promise<LoadCodeAssistResponse>;
    getCodeAssistGlobalUserSetting(): Promise<CodeAssistGlobalUserSettingResponse>;
    setCodeAssistGlobalUserSetting(req: SetCodeAssistGlobalUserSettingRequest): Promise<CodeAssistGlobalUserSettingResponse>;
    countTokens(req: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(_req: EmbedContentParameters): Promise<EmbedContentResponse>;
    requestPost<T>(method: string, req: object, signal?: AbortSignal): Promise<T>;
    requestGet<T>(method: string, signal?: AbortSignal): Promise<T>;
    requestStreamingPost<T>(method: string, req: object, signal?: AbortSignal): Promise<AsyncGenerator<T>>;
    getMethodUrl(method: string): string;
}
