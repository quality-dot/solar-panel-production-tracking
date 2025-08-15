import { ProviderV1, LanguageModelV1, ImageModelV1 } from '@ai-sdk/provider';
import { Resolvable, FetchFunction } from '@ai-sdk/provider-utils';
import { InternalGoogleGenerativeAISettings } from '@ai-sdk/google/internal';

type GoogleVertexModelId = 'gemini-2.0-flash-001' | 'gemini-1.5-flash' | 'gemini-1.5-flash-001' | 'gemini-1.5-flash-002' | 'gemini-1.5-pro' | 'gemini-1.5-pro-001' | 'gemini-1.5-pro-002' | 'gemini-1.0-pro-001' | 'gemini-1.0-pro-vision-001' | 'gemini-1.0-pro' | 'gemini-1.0-pro-001' | 'gemini-1.0-pro-002' | 'gemini-2.0-flash-lite-preview-02-05' | 'gemini-2.0-pro-exp-02-05' | 'gemini-2.0-flash-exp' | (string & {});
interface GoogleVertexSettings extends InternalGoogleGenerativeAISettings {
}

type GoogleVertexImageModelId = 'imagen-3.0-generate-001' | 'imagen-3.0-generate-002' | 'imagen-3.0-fast-generate-001' | (string & {});
interface GoogleVertexImageSettings {
    /**
  Override the maximum number of images per call (default 4)
     */
    maxImagesPerCall?: number;
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

interface GoogleCredentials {
    /**
     * The client email for the Google Cloud service account. Defaults to the
     * value of the `GOOGLE_CLIENT_EMAIL` environment variable.
     */
    clientEmail: string;
    /**
     * The private key for the Google Cloud service account. Defaults to the
     * value of the `GOOGLE_PRIVATE_KEY` environment variable.
     */
    privateKey: string;
    /**
     * Optional. The private key ID for the Google Cloud service account. Defaults
     * to the value of the `GOOGLE_PRIVATE_KEY_ID` environment variable.
     */
    privateKeyId?: string;
}

interface GoogleVertexProviderSettings extends GoogleVertexProviderSettings$1 {
    /**
     * Optional. The Google credentials for the Google Cloud service account. If
     * not provided, the Google Vertex provider will use environment variables to
     * load the credentials.
     */
    googleCredentials?: GoogleCredentials;
}
declare function createVertex(options?: GoogleVertexProviderSettings): GoogleVertexProvider;
/**
Default Google Vertex AI provider instance.
 */
declare const vertex: GoogleVertexProvider;

export { type GoogleVertexProvider, type GoogleVertexProviderSettings, createVertex, vertex };
