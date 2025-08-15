import OpenAI from "openai";
import { FunctionDef } from "./functions";
type Message = OpenAI.Chat.ChatCompletionMessageParam;
type Function = OpenAI.Chat.ChatCompletionCreateParams.Function;
type FunctionCall = OpenAI.Chat.ChatCompletionCreateParams.FunctionCallOption;
/**
 * Estimate the number of tokens a prompt will use.
 * @param {Object} prompt OpenAI prompt data
 * @param {Message[]} prompt.messages OpenAI chat messages
 * @param {Function[]} prompt.functions OpenAI function definitions
 * @returns An estimate for the number of tokens the prompt will use
 */
export declare function promptTokensEstimate({ messages, functions, function_call, }: {
    messages: Message[];
    functions?: Function[];
    function_call?: "none" | "auto" | FunctionCall;
}): number;
/**
 * Count the number of tokens in a string.
 * @param s The string to count tokens in
 * @returns The number of tokens in the string
 */
export declare function stringTokens(s: string): number;
/**
 * Estimate the number of tokens a message will use. Note that using the message within a prompt will add extra
 * tokens, so you might want to use `promptTokensEstimate` instead.
 * @param message An OpenAI chat message
 * @returns An estimate for the number of tokens the message will use
 */
export declare function messageTokensEstimate(message: Message): number;
/**
 * Estimate the number of tokens a function definition will use. Note that using the function definition within
 * a prompt will add extra tokens, so you might want to use `promptTokensEstimate` instead.
 * @param funcs An array of OpenAI function definitions
 * @returns An estimate for the number of tokens the function definitions will use
 */
export declare function functionsTokensEstimate(funcs: FunctionDef[]): number;
export {};
