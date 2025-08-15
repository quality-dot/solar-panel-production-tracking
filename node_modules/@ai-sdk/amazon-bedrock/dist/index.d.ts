import { ProviderV1, LanguageModelV1, EmbeddingModelV1, ImageModelV1 } from '@ai-sdk/provider';
import { FetchFunction } from '@ai-sdk/provider-utils';

type BedrockChatModelId = 'amazon.titan-tg1-large' | 'amazon.titan-text-express-v1' | 'anthropic.claude-v2' | 'anthropic.claude-v2:1' | 'anthropic.claude-instant-v1' | 'anthropic.claude-sonnet-4-20250514-v1:0' | 'anthropic.claude-opus-4-20250514-v1:0' | 'anthropic.claude-3-7-sonnet-20250219-v1:0' | 'anthropic.claude-3-5-sonnet-20240620-v1:0' | 'anthropic.claude-3-5-sonnet-20241022-v2:0' | 'anthropic.claude-3-5-haiku-20241022-v1:0' | 'anthropic.claude-3-sonnet-20240229-v1:0' | 'anthropic.claude-3-haiku-20240307-v1:0' | 'anthropic.claude-3-opus-20240229-v1:0' | 'cohere.command-text-v14' | 'cohere.command-light-text-v14' | 'cohere.command-r-v1:0' | 'cohere.command-r-plus-v1:0' | 'meta.llama3-70b-instruct-v1:0' | 'meta.llama3-8b-instruct-v1:0' | 'meta.llama3-1-405b-instruct-v1:0' | 'meta.llama3-1-70b-instruct-v1:0' | 'meta.llama3-1-8b-instruct-v1:0' | 'meta.llama3-2-11b-instruct-v1:0' | 'meta.llama3-2-1b-instruct-v1:0' | 'meta.llama3-2-3b-instruct-v1:0' | 'meta.llama3-2-90b-instruct-v1:0' | 'mistral.mistral-7b-instruct-v0:2' | 'mistral.mixtral-8x7b-instruct-v0:1' | 'mistral.mistral-large-2402-v1:0' | 'mistral.mistral-small-2402-v1:0' | 'amazon.titan-text-express-v1' | 'amazon.titan-text-lite-v1' | (string & {});
interface BedrockChatSettings {
    /**
  Additional inference parameters that the model supports,
  beyond the base set of inference parameters that Converse
  supports in the inferenceConfig field
  */
    additionalModelRequestFields?: Record<string, any>;
}

type BedrockEmbeddingModelId = 'amazon.titan-embed-text-v1' | 'amazon.titan-embed-text-v2:0' | 'cohere.embed-english-v3' | 'cohere.embed-multilingual-v3' | (string & {});
interface BedrockEmbeddingSettings {
    /**
  The number of dimensions the resulting output embeddings should have (defaults to 1024).
  Only supported in amazon.titan-embed-text-v2:0.
     */
    dimensions?: 1024 | 512 | 256;
    /**
  Flag indicating whether or not to normalize the output embeddings. Defaults to true
  Only supported in amazon.titan-embed-text-v2:0.
     */
    normalize?: boolean;
}

type BedrockImageModelId = 'amazon.nova-canvas-v1:0' | (string & {});
interface BedrockImageSettings {
    /**
     * Override the maximum number of images per call (default is dependent on the
     * model, or 1 for an unknown model).
     */
    maxImagesPerCall?: number;
}

interface BedrockCredentials {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
}

interface AmazonBedrockProviderSettings {
    /**
  The AWS region to use for the Bedrock provider. Defaults to the value of the
  `AWS_REGION` environment variable.
     */
    region?: string;
    /**
  The AWS access key ID to use for the Bedrock provider. Defaults to the value of the
  `AWS_ACCESS_KEY_ID` environment variable.
     */
    accessKeyId?: string;
    /**
  The AWS secret access key to use for the Bedrock provider. Defaults to the value of the
  `AWS_SECRET_ACCESS_KEY` environment variable.
     */
    secretAccessKey?: string;
    /**
  The AWS session token to use for the Bedrock provider. Defaults to the value of the
  `AWS_SESSION_TOKEN` environment variable.
     */
    sessionToken?: string;
    /**
  Base URL for the Bedrock API calls.
     */
    baseURL?: string;
    /**
  Custom headers to include in the requests.
     */
    headers?: Record<string, string>;
    /**
  Custom fetch implementation. You can use it as a middleware to intercept requests,
  or to provide a custom fetch implementation for e.g. testing.
  */
    fetch?: FetchFunction;
    /**
  The AWS credential provider to use for the Bedrock provider to get dynamic
  credentials similar to the AWS SDK. Setting a provider here will cause its
  credential values to be used instead of the `accessKeyId`, `secretAccessKey`,
  and `sessionToken` settings.
     */
    credentialProvider?: () => PromiseLike<Omit<BedrockCredentials, 'region'>>;
    generateId?: () => string;
}
interface AmazonBedrockProvider extends ProviderV1 {
    (modelId: BedrockChatModelId, settings?: BedrockChatSettings): LanguageModelV1;
    languageModel(modelId: BedrockChatModelId, settings?: BedrockChatSettings): LanguageModelV1;
    embedding(modelId: BedrockEmbeddingModelId, settings?: BedrockEmbeddingSettings): EmbeddingModelV1<string>;
    image(modelId: BedrockImageModelId, settings?: BedrockImageSettings): ImageModelV1;
    imageModel(modelId: BedrockImageModelId, settings?: BedrockImageSettings): ImageModelV1;
}
/**
Create an Amazon Bedrock provider instance.
 */
declare function createAmazonBedrock(options?: AmazonBedrockProviderSettings): AmazonBedrockProvider;
/**
Default Bedrock provider instance.
 */
declare const bedrock: AmazonBedrockProvider;

export { type AmazonBedrockProvider, type AmazonBedrockProviderSettings, bedrock, createAmazonBedrock };
