"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionsTokensEstimate = exports.messageTokensEstimate = exports.stringTokens = exports.promptTokensEstimate = void 0;
const js_tiktoken_1 = require("js-tiktoken");
const functions_1 = require("./functions");
let encoder;
/**
 * Estimate the number of tokens a prompt will use.
 * @param {Object} prompt OpenAI prompt data
 * @param {Message[]} prompt.messages OpenAI chat messages
 * @param {Function[]} prompt.functions OpenAI function definitions
 * @returns An estimate for the number of tokens the prompt will use
 */
function promptTokensEstimate({ messages, functions, function_call, }) {
    // It appears that if functions are present, the first system message is padded with a trailing newline. This
    // was inferred by trying lots of combinations of messages and functions and seeing what the token counts were.
    let paddedSystem = false;
    let tokens = messages
        .map((m) => {
        if (m.role === "system" && functions && !paddedSystem) {
            m = { ...m, content: m.content + "\n" };
            paddedSystem = true;
        }
        return messageTokensEstimate(m);
    })
        .reduce((a, b) => a + b, 0);
    // Each completion (vs message) seems to carry a 3-token overhead
    tokens += 3;
    // If there are functions, add the function definitions as they count towards token usage
    if (functions) {
        tokens += functionsTokensEstimate(functions);
    }
    // If there's a system message _and_ functions are present, subtract four tokens. I assume this is because
    // functions typically add a system message, but reuse the first one if it's already there. This offsets
    // the extra 9 tokens added by the function definitions.
    if (functions && messages.find((m) => m.role === "system")) {
        tokens -= 4;
    }
    // If function_call is 'none', add one token.
    // If it's a FunctionCall object, add 4 + the number of tokens in the function name.
    // If it's undefined or 'auto', don't add anything.
    if (function_call && function_call !== "auto") {
        tokens +=
            function_call === "none" ? 1 : stringTokens(function_call.name) + 4;
    }
    return tokens;
}
exports.promptTokensEstimate = promptTokensEstimate;
/**
 * Count the number of tokens in a string.
 * @param s The string to count tokens in
 * @returns The number of tokens in the string
 */
function stringTokens(s) {
    if (!encoder) {
        encoder = (0, js_tiktoken_1.getEncoding)("cl100k_base");
    }
    return encoder.encode(s).length;
}
exports.stringTokens = stringTokens;
/**
 * Estimate the number of tokens a message will use. Note that using the message within a prompt will add extra
 * tokens, so you might want to use `promptTokensEstimate` instead.
 * @param message An OpenAI chat message
 * @returns An estimate for the number of tokens the message will use
 */
function messageTokensEstimate(message) {
    var _a, _b;
    const components = [
        message.role,
        message.content,
        message.name,
        (_a = message.function_call) === null || _a === void 0 ? void 0 : _a.name,
        (_b = message.function_call) === null || _b === void 0 ? void 0 : _b.arguments,
    ].filter((v) => !!v);
    let tokens = components.map(stringTokens).reduce((a, b) => a + b, 0);
    tokens += 3; // Add three per message
    if (message.name) {
        tokens += 1;
    }
    if (message.role === "function") {
        tokens -= 2;
    }
    if (message.function_call) {
        tokens += 3;
    }
    return tokens;
}
exports.messageTokensEstimate = messageTokensEstimate;
/**
 * Estimate the number of tokens a function definition will use. Note that using the function definition within
 * a prompt will add extra tokens, so you might want to use `promptTokensEstimate` instead.
 * @param funcs An array of OpenAI function definitions
 * @returns An estimate for the number of tokens the function definitions will use
 */
function functionsTokensEstimate(funcs) {
    const promptDefinitions = (0, functions_1.formatFunctionDefinitions)(funcs);
    let tokens = stringTokens(promptDefinitions);
    tokens += 9; // Add nine per completion
    return tokens;
}
exports.functionsTokensEstimate = functionsTokensEstimate;
//# sourceMappingURL=index.js.map