import { z } from 'zod';
import { GoogleAuthOptions } from 'google-auth-library';
import { ProviderV1, LanguageModelV1, ImageModelV1 } from '@ai-sdk/provider';
import { Resolvable, FetchFunction } from '@ai-sdk/provider-utils';
import { InternalGoogleGenerativeAISettings } from '@ai-sdk/google/internal';

type GoogleVertexImageModelId = 'imagen-3.0-generate-001' | 'imagen-3.0-generate-002' | 'imagen-3.0-fast-generate-001' | (string & {});
interface GoogleVertexImageSettings {
    /**
  Override the maximum number of images per call (default 4)
     */
    maxImagesPerCall?: number;
}

declare const vertexImageProviderOptionsSchema: z.ZodObject<{
    negativePrompt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    personGeneration: z.ZodOptional<z.ZodNullable<z.ZodEnum<["dont_allow", "allow_adult", "allow_all"]>>>;
    safetySetting: z.ZodOptional<z.ZodNullable<z.ZodEnum<["block_low_and_above", "block_medium_and_above", "block_only_high", "block_none"]>>>;
    addWatermark: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    storageUri: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    negativePrompt?: string | null | undefined;
    personGeneration?: "dont_allow" | "allow_adult" | "allow_all" | null | undefined;
    safetySetting?: "block_low_and_above" | "block_medium_and_above" | "block_only_high" | "block_none" | null | undefined;
    addWatermark?: boolean | null | undefined;
    storageUri?: string | null | undefined;
}, {
    negativePrompt?: string | null | undefined;
    personGeneration?: "dont_allow" | "allow_adult" | "allow_all" | null | undefined;
    safetySetting?: "block_low_and_above" | "block_medium_and_above" | "block_only_high" | "block_none" | null | undefined;
    addWatermark?: boolean | null | undefined;
    storageUri?: string | null | undefined;
}>;
type GoogleVertexImageProviderOptions = z.infer<typeof vertexImageProviderOptionsSchema>;

type GoogleVertexModelId = 'gemini-2.0-flash-001' | 'gemini-1.5-flash' | 'gemini-1.5-flash-001' | 'gemini-1.5-flash-002' | 'gemini-1.5-pro' | 'gemini-1.5-pro-001' | 'gemini-1.5-pro-002' | 'gemini-1.0-pro-001' | 'gemini-1.0-pro-vision-001' | 'gemini-1.0-pro' | 'gemini-1.0-pro-001' | 'gemini-1.0-pro-002' | 'gemini-2.0-flash-lite-preview-02-05' | 'gemini-2.0-pro-exp-02-05' | 'gemini-2.0-flash-exp' | (string & {});
interface GoogleVertexSettings extends InternalGoogleGenerativeAISettings {
}

interface GoogleVertexProvider extends ProviderV1 {
    /**
  Creates a model for text generation.
     */
    (modelId: GoogleVertexModelId, settings?: GoogleVertexSettings): LanguageModelV1;
    languageModel: (modelId: GoogleVertexModelId, settings?: GoogleVertexSettings) => LanguageModelV1;
    /**
     * Creates a model for image generation.
     */
    image(modelId: GoogleVertexImageModelId, settings?: GoogleVertexImageSettings): ImageModelV1;
    /**
  Creates a model for image generation.
     */
    imageModel(modelId: GoogleVertexImageModelId, settings?: GoogleVertexImageSettings): ImageModelV1;
}
interface GoogleVertexProviderSettings$1 {
    /**
  Your Google Vertex location. Defaults to the environment variable `GOOGLE_VERTEX_LOCATION`.
     */
    location?: string;
    /**
  Your Google Vertex project. Defaults to the environment variable `GOOGLE_VERTEX_PROJECT`.
    */
    project?: string;
    /**
     * Headers to use for requests. Can be:
     * - A headers object
     * - A Promise that resolves to a headers object
     * - A function that returns a headers object
     * - A function that returns a Promise of a headers object
     */
    headers?: Resolvable<Record<string, string | undefined>>;
    /**
  Custom fetch implementation. You can use it as a middleware to intercept requests,
  or to provide a custom fetch implementation for e.g. testing.
      */
    fetch?: FetchFunction;
    generateId?: () => string;
    /**
  Base URL for the Google Vertex API calls.
       */
    baseURL?: string;
}

interface GoogleVertexProviderSettings extends GoogleVertexProviderSettings$1 {
    /**
   Optional. The Authentication options provided by google-auth-library.
  Complete list of authentication options is documented in the
  GoogleAuthOptions interface:
  https://github.com/googleapis/google-auth-library-nodejs/blob/main/src/auth/googleauth.ts.
     */
    googleAuthOptions?: GoogleAuthOptions;
}

declare function createVertex(options?: GoogleVertexProviderSettings): GoogleVertexProvider;
/**
Default Google Vertex AI provider instance.
 */
declare const vertex: GoogleVertexProvider;

export { type GoogleVertexImageProviderOptions, type GoogleVertexProvider, type GoogleVertexProviderSettings, createVertex, vertex };
