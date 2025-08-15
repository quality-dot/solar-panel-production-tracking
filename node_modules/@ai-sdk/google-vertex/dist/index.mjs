// src/google-vertex-provider-node.ts
import { resolve as resolve3 } from "@ai-sdk/provider-utils";

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

// src/google-vertex-provider.ts
import {
  generateId,
  loadSetting,
  withoutTrailingSlash
} from "@ai-sdk/provider-utils";

// src/google-vertex-embedding-model.ts
import {
  TooManyEmbeddingValuesForCallError
} from "@ai-sdk/provider";
import {
  combineHeaders,
  createJsonResponseHandler,
  postJsonToApi,
  resolve
} from "@ai-sdk/provider-utils";
import { z as z2 } from "zod";

// src/google-vertex-error.ts
import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";
import { z } from "zod";
var googleVertexErrorDataSchema = z.object({
  error: z.object({
    code: z.number().nullable(),
    message: z.string(),
    status: z.string()
  })
});
var googleVertexFailedResponseHandler = createJsonErrorResponseHandler(
  {
    errorSchema: googleVertexErrorDataSchema,
    errorToMessage: (data) => data.error.message
  }
);

// src/google-vertex-embedding-model.ts
var GoogleVertexEmbeddingModel = class {
  constructor(modelId, settings, config) {
    this.specificationVersion = "v1";
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }
  get provider() {
    return this.config.provider;
  }
  get maxEmbeddingsPerCall() {
    return 2048;
  }
  get supportsParallelCalls() {
    return true;
  }
  async doEmbed({
    values,
    headers,
    abortSignal
  }) {
    if (values.length > this.maxEmbeddingsPerCall) {
      throw new TooManyEmbeddingValuesForCallError({
        provider: this.provider,
        modelId: this.modelId,
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        values
      });
    }
    const mergedHeaders = combineHeaders(
      await resolve(this.config.headers),
      headers
    );
    const url = `${this.config.baseURL}/models/${this.modelId}:predict`;
    const { responseHeaders, value: response } = await postJsonToApi({
      url,
      headers: mergedHeaders,
      body: {
        instances: values.map((value) => ({ content: value })),
        parameters: {
          outputDimensionality: this.settings.outputDimensionality
        }
      },
      failedResponseHandler: googleVertexFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        googleVertexTextEmbeddingResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch
    });
    return {
      embeddings: response.predictions.map(
        (prediction) => prediction.embeddings.values
      ),
      usage: {
        tokens: response.predictions.reduce(
          (tokenCount, prediction) => tokenCount + prediction.embeddings.statistics.token_count,
          0
        )
      },
      rawResponse: { headers: responseHeaders }
    };
  }
};
var googleVertexTextEmbeddingResponseSchema = z2.object({
  predictions: z2.array(
    z2.object({
      embeddings: z2.object({
        values: z2.array(z2.number()),
        statistics: z2.object({
          token_count: z2.number()
        })
      })
    })
  )
});

// src/google-vertex-provider.ts
import { GoogleGenerativeAILanguageModel } from "@ai-sdk/google/internal";

// src/google-vertex-image-model.ts
import {
  combineHeaders as combineHeaders2,
  createJsonResponseHandler as createJsonResponseHandler2,
  parseProviderOptions,
  postJsonToApi as postJsonToApi2,
  resolve as resolve2
} from "@ai-sdk/provider-utils";
import { z as z3 } from "zod";
var GoogleVertexImageModel = class {
  constructor(modelId, settings, config) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
    this.specificationVersion = "v1";
  }
  get provider() {
    return this.config.provider;
  }
  get maxImagesPerCall() {
    var _a;
    return (_a = this.settings.maxImagesPerCall) != null ? _a : 4;
  }
  async doGenerate({
    prompt,
    n,
    size,
    aspectRatio,
    seed,
    providerOptions,
    headers,
    abortSignal
  }) {
    var _a, _b, _c, _d, _e;
    const warnings = [];
    if (size != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "size",
        details: "This model does not support the `size` option. Use `aspectRatio` instead."
      });
    }
    const vertexImageOptions = parseProviderOptions({
      provider: "vertex",
      providerOptions,
      schema: vertexImageProviderOptionsSchema
    });
    const body = {
      instances: [{ prompt }],
      parameters: {
        sampleCount: n,
        ...aspectRatio != null ? { aspectRatio } : {},
        ...seed != null ? { seed } : {},
        ...vertexImageOptions != null ? vertexImageOptions : {}
      }
    };
    const currentDate = (_c = (_b = (_a = this.config._internal) == null ? void 0 : _a.currentDate) == null ? void 0 : _b.call(_a)) != null ? _c : /* @__PURE__ */ new Date();
    const { value: response, responseHeaders } = await postJsonToApi2({
      url: `${this.config.baseURL}/models/${this.modelId}:predict`,
      headers: combineHeaders2(await resolve2(this.config.headers), headers),
      body,
      failedResponseHandler: googleVertexFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler2(
        vertexImageResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch
    });
    return {
      images: (_e = (_d = response.predictions) == null ? void 0 : _d.map(
        (p) => p.bytesBase64Encoded
      )) != null ? _e : [],
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders
      }
    };
  }
};
var vertexImageResponseSchema = z3.object({
  predictions: z3.array(z3.object({ bytesBase64Encoded: z3.string() })).nullish()
});
var vertexImageProviderOptionsSchema = z3.object({
  negativePrompt: z3.string().nullish(),
  personGeneration: z3.enum(["dont_allow", "allow_adult", "allow_all"]).nullish(),
  safetySetting: z3.enum([
    "block_low_and_above",
    "block_medium_and_above",
    "block_only_high",
    "block_none"
  ]).nullish(),
  addWatermark: z3.boolean().nullish(),
  storageUri: z3.string().nullish()
});

// src/google-vertex-supported-file-url.ts
function isSupportedFileUrl(url) {
  return ["http:", "https:", "gs:"].includes(url.protocol);
}

// src/google-vertex-provider.ts
function createVertex(options = {}) {
  const loadVertexProject = () => loadSetting({
    settingValue: options.project,
    settingName: "project",
    environmentVariableName: "GOOGLE_VERTEX_PROJECT",
    description: "Google Vertex project"
  });
  const loadVertexLocation = () => loadSetting({
    settingValue: options.location,
    settingName: "location",
    environmentVariableName: "GOOGLE_VERTEX_LOCATION",
    description: "Google Vertex location"
  });
  const loadBaseURL = () => {
    var _a;
    const region = loadVertexLocation();
    const project = loadVertexProject();
    return (_a = withoutTrailingSlash(options.baseURL)) != null ? _a : `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google`;
  };
  const createConfig = (name) => {
    var _a;
    return {
      provider: `google.vertex.${name}`,
      headers: (_a = options.headers) != null ? _a : {},
      fetch: options.fetch,
      baseURL: loadBaseURL()
    };
  };
  const createChatModel = (modelId, settings = {}) => {
    var _a;
    return new GoogleGenerativeAILanguageModel(modelId, settings, {
      ...createConfig("chat"),
      generateId: (_a = options.generateId) != null ? _a : generateId,
      isSupportedUrl: isSupportedFileUrl
    });
  };
  const createEmbeddingModel = (modelId, settings = {}) => new GoogleVertexEmbeddingModel(
    modelId,
    settings,
    createConfig("embedding")
  );
  const createImageModel = (modelId, settings = {}) => new GoogleVertexImageModel(modelId, settings, createConfig("image"));
  const provider = function(modelId, settings) {
    if (new.target) {
      throw new Error(
        "The Google Vertex AI model function cannot be called with the new keyword."
      );
    }
    return createChatModel(modelId, settings);
  };
  provider.languageModel = createChatModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.image = createImageModel;
  provider.imageModel = createImageModel;
  return provider;
}

// src/google-vertex-provider-node.ts
function createVertex2(options = {}) {
  return createVertex({
    ...options,
    headers: async () => ({
      Authorization: `Bearer ${await generateAuthToken(
        options.googleAuthOptions
      )}`,
      ...await resolve3(options.headers)
    })
  });
}
var vertex = createVertex2();
export {
  createVertex2 as createVertex,
  vertex
};
//# sourceMappingURL=index.mjs.map