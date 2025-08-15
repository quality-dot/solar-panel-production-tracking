// src/anthropic/google-vertex-anthropic-provider-node.ts
import { resolve } from "@ai-sdk/provider-utils";

// src/google-vertex-auth-google-auth-library.ts
import { GoogleAuth } from "google-auth-library";
var authInstance = null;
var authOptions = null;
function getAuth(options) {
  if (!authInstance || options !== authOptions) {
    authInstance = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      ...options
    });
    authOptions = options;
  }
  return authInstance;
}
async function generateAuthToken(options) {
  const auth = getAuth(options || {});
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return (token == null ? void 0 : token.token) || null;
}

// src/anthropic/google-vertex-anthropic-provider.ts
import {
  NoSuchModelError
} from "@ai-sdk/provider";
import {
  loadOptionalSetting,
  withoutTrailingSlash
} from "@ai-sdk/provider-utils";
import {
  anthropicTools,
  AnthropicMessagesLanguageModel
} from "@ai-sdk/anthropic/internal";
function createVertexAnthropic(options = {}) {
  var _a;
  const location = loadOptionalSetting({
    settingValue: options.location,
    environmentVariableName: "GOOGLE_VERTEX_LOCATION"
  });
  const project = loadOptionalSetting({
    settingValue: options.project,
    environmentVariableName: "GOOGLE_VERTEX_PROJECT"
  });
  const baseURL = (_a = withoutTrailingSlash(options.baseURL)) != null ? _a : `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/anthropic/models`;
  const createChatModel = (modelId, settings = {}) => {
    var _a2;
    return new AnthropicMessagesLanguageModel(
      modelId,
      settings,
      {
        provider: "vertex.anthropic.messages",
        baseURL,
        headers: (_a2 = options.headers) != null ? _a2 : {},
        fetch: options.fetch,
        supportsImageUrls: false,
        buildRequestUrl: (baseURL2, isStreaming) => `${baseURL2}/${modelId}:${isStreaming ? "streamRawPredict" : "rawPredict"}`,
        transformRequestBody: (args) => {
          const { model, ...rest } = args;
          return {
            ...rest,
            anthropic_version: "vertex-2023-10-16"
          };
        }
      }
    );
  };
  const provider = function(modelId, settings) {
    if (new.target) {
      throw new Error(
        "The Anthropic model function cannot be called with the new keyword."
      );
    }
    return createChatModel(modelId, settings);
  };
  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.messages = createChatModel;
  provider.textEmbeddingModel = (modelId) => {
    throw new NoSuchModelError({ modelId, modelType: "textEmbeddingModel" });
  };
  provider.tools = anthropicTools;
  return provider;
}

// src/anthropic/google-vertex-anthropic-provider-node.ts
function createVertexAnthropic2(options = {}) {
  return createVertexAnthropic({
    ...options,
    headers: async () => ({
      Authorization: `Bearer ${await generateAuthToken(
        options.googleAuthOptions
      )}`,
      ...await resolve(options.headers)
    })
  });
}
var vertexAnthropic = createVertexAnthropic2();
export {
  createVertexAnthropic2 as createVertexAnthropic,
  vertexAnthropic
};
//# sourceMappingURL=index.mjs.map