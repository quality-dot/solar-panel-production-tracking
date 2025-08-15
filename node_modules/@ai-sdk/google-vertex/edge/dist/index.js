"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/edge/index.ts
var edge_exports = {};
__export(edge_exports, {
  createVertex: () => createVertex2,
  vertex: () => vertex
});
module.exports = __toCommonJS(edge_exports);

// src/edge/google-vertex-provider-edge.ts
var import_provider_utils6 = require("@ai-sdk/provider-utils");

// src/google-vertex-provider.ts
var import_provider_utils4 = require("@ai-sdk/provider-utils");

// src/google-vertex-embedding-model.ts
var import_provider = require("@ai-sdk/provider");
var import_provider_utils2 = require("@ai-sdk/provider-utils");
var import_zod2 = require("zod");

// src/google-vertex-error.ts
var import_provider_utils = require("@ai-sdk/provider-utils");
var import_zod = require("zod");
var googleVertexErrorDataSchema = import_zod.z.object({
  error: import_zod.z.object({
    code: import_zod.z.number().nullable(),
    message: import_zod.z.string(),
    status: import_zod.z.string()
  })
});
var googleVertexFailedResponseHandler = (0, import_provider_utils.createJsonErrorResponseHandler)(
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
      throw new import_provider.TooManyEmbeddingValuesForCallError({
        provider: this.provider,
        modelId: this.modelId,
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        values
      });
    }
    const mergedHeaders = (0, import_provider_utils2.combineHeaders)(
      await (0, import_provider_utils2.resolve)(this.config.headers),
      headers
    );
    const url = `${this.config.baseURL}/models/${this.modelId}:predict`;
    const { responseHeaders, value: response } = await (0, import_provider_utils2.postJsonToApi)({
      url,
      headers: mergedHeaders,
      body: {
        instances: values.map((value) => ({ content: value })),
        parameters: {
          outputDimensionality: this.settings.outputDimensionality
        }
      },
      failedResponseHandler: googleVertexFailedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils2.createJsonResponseHandler)(
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
var googleVertexTextEmbeddingResponseSchema = import_zod2.z.object({
  predictions: import_zod2.z.array(
    import_zod2.z.object({
      embeddings: import_zod2.z.object({
        values: import_zod2.z.array(import_zod2.z.number()),
        statistics: import_zod2.z.object({
          token_count: import_zod2.z.number()
        })
      })
    })
  )
});

// src/google-vertex-provider.ts
var import_internal = require("@ai-sdk/google/internal");

// src/google-vertex-image-model.ts
var import_provider_utils3 = require("@ai-sdk/provider-utils");
var import_zod3 = require("zod");
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
    const vertexImageOptions = (0, import_provider_utils3.parseProviderOptions)({
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
    const { value: response, responseHeaders } = await (0, import_provider_utils3.postJsonToApi)({
      url: `${this.config.baseURL}/models/${this.modelId}:predict`,
      headers: (0, import_provider_utils3.combineHeaders)(await (0, import_provider_utils3.resolve)(this.config.headers), headers),
      body,
      failedResponseHandler: googleVertexFailedResponseHandler,
      successfulResponseHandler: (0, import_provider_utils3.createJsonResponseHandler)(
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
var vertexImageResponseSchema = import_zod3.z.object({
  predictions: import_zod3.z.array(import_zod3.z.object({ bytesBase64Encoded: import_zod3.z.string() })).nullish()
});
var vertexImageProviderOptionsSchema = import_zod3.z.object({
  negativePrompt: import_zod3.z.string().nullish(),
  personGeneration: import_zod3.z.enum(["dont_allow", "allow_adult", "allow_all"]).nullish(),
  safetySetting: import_zod3.z.enum([
    "block_low_and_above",
    "block_medium_and_above",
    "block_only_high",
    "block_none"
  ]).nullish(),
  addWatermark: import_zod3.z.boolean().nullish(),
  storageUri: import_zod3.z.string().nullish()
});

// src/google-vertex-supported-file-url.ts
function isSupportedFileUrl(url) {
  return ["http:", "https:", "gs:"].includes(url.protocol);
}

// src/google-vertex-provider.ts
function createVertex(options = {}) {
  const loadVertexProject = () => (0, import_provider_utils4.loadSetting)({
    settingValue: options.project,
    settingName: "project",
    environmentVariableName: "GOOGLE_VERTEX_PROJECT",
    description: "Google Vertex project"
  });
  const loadVertexLocation = () => (0, import_provider_utils4.loadSetting)({
    settingValue: options.location,
    settingName: "location",
    environmentVariableName: "GOOGLE_VERTEX_LOCATION",
    description: "Google Vertex location"
  });
  const loadBaseURL = () => {
    var _a;
    const region = loadVertexLocation();
    const project = loadVertexProject();
    return (_a = (0, import_provider_utils4.withoutTrailingSlash)(options.baseURL)) != null ? _a : `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google`;
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
    return new import_internal.GoogleGenerativeAILanguageModel(modelId, settings, {
      ...createConfig("chat"),
      generateId: (_a = options.generateId) != null ? _a : import_provider_utils4.generateId,
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
var import_provider_utils5 = require("@ai-sdk/provider-utils");
var loadCredentials = async () => {
  try {
    return {
      clientEmail: (0, import_provider_utils5.loadSetting)({
        settingValue: void 0,
        settingName: "clientEmail",
        environmentVariableName: "GOOGLE_CLIENT_EMAIL",
        description: "Google client email"
      }),
      privateKey: (0, import_provider_utils5.loadSetting)({
        settingValue: void 0,
        settingName: "privateKey",
        environmentVariableName: "GOOGLE_PRIVATE_KEY",
        description: "Google private key"
      }),
      privateKeyId: (0, import_provider_utils5.loadOptionalSetting)({
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
      ...await (0, import_provider_utils6.resolve)(options.headers)
    })
  });
}
var vertex = createVertex2();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createVertex,
  vertex
});
//# sourceMappingURL=index.js.map