// src/edge/google-vertex-provider-edge.ts
import { resolve as resolve3 } from "@ai-sdk/provider-utils";

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

// src/edge/google-vertex-auth-edge.ts
import { loadOptionalSetting, loadSetting as loadSetting2 } from "@ai-sdk/provider-utils";
var loadCredentials = async () => {
  try {
    return {
      clientEmail: loadSetting2({
        settingValue: void 0,
        settingName: "clientEmail",
        environmentVariableName: "GOOGLE_CLIENT_EMAIL",
        description: "Google client email"
      }),
      privateKey: loadSetting2({
        settingValue: void 0,
        settingName: "privateKey",
        environmentVariableName: "GOOGLE_PRIVATE_KEY",
        description: "Google private key"
      }),
      privateKeyId: loadOptionalSetting({
        settingValue: void 0,
        environmentVariableName: "GOOGLE_PRIVATE_KEY_ID"
      })
    };
  } catch (error) {
    throw new Error(`Failed to load Google credentials: ${error.message}`);
  }
};
var base64url = (str) => {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};
var importPrivateKey = async (pemKey) => {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pemKey.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
  const binaryString = atob(pemContents);
  const binaryData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryData[i] = binaryString.charCodeAt(i);
  }
  return await crypto.subtle.importKey(
    "pkcs8",
    binaryData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["sign"]
  );
};
var buildJwt = async (credentials) => {
  const now = Math.floor(Date.now() / 1e3);
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  if (credentials.privateKeyId) {
    header.kid = credentials.privateKeyId;
  }
  const payload = {
    iss: credentials.clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  const privateKey = await importPrivateKey(credentials.privateKey);
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload)
  )}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(signingInput);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    data
  );
  const signatureBase64 = base64url(
    String.fromCharCode(...new Uint8Array(signature))
  );
  return `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload)
  )}.${signatureBase64}`;
};
async function generateAuthToken(credentials) {
  try {
    const creds = credentials || await loadCredentials();
    const jwt = await buildJwt(creds);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    });
    if (!response.ok) {
      throw new Error(`Token request failed: ${response.statusText}`);
    }
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    throw error;
  }
}

// src/edge/google-vertex-provider-edge.ts
function createVertex2(options = {}) {
  return createVertex({
    ...options,
    headers: async () => ({
      Authorization: `Bearer ${await generateAuthToken(
        options.googleCredentials
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