/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { AuthType } from '../core/contentGenerator.js';
import { getDecisionFromOutcome, } from './tool-call-decision.js';
export class StartSessionEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    model;
    embedding_model;
    sandbox_enabled;
    core_tools_enabled;
    approval_mode;
    api_key_enabled;
    vertex_ai_enabled;
    debug_enabled;
    mcp_servers;
    telemetry_enabled;
    telemetry_log_user_prompts_enabled;
    file_filtering_respect_git_ignore;
    constructor(config) {
        const generatorConfig = config.getContentGeneratorConfig();
        const mcpServers = config.getMcpServers();
        let useGemini = false;
        let useVertex = false;
        if (generatorConfig && generatorConfig.authType) {
            useGemini = generatorConfig.authType === AuthType.USE_GEMINI;
            useVertex = generatorConfig.authType === AuthType.USE_VERTEX_AI;
        }
        this['event.name'] = 'cli_config';
        this.model = config.getModel();
        this.embedding_model = config.getEmbeddingModel();
        this.sandbox_enabled =
            typeof config.getSandbox() === 'string' || !!config.getSandbox();
        this.core_tools_enabled = (config.getCoreTools() ?? []).join(',');
        this.approval_mode = config.getApprovalMode();
        this.api_key_enabled = useGemini || useVertex;
        this.vertex_ai_enabled = useVertex;
        this.debug_enabled = config.getDebugMode();
        this.mcp_servers = mcpServers ? Object.keys(mcpServers).join(',') : '';
        this.telemetry_enabled = config.getTelemetryEnabled();
        this.telemetry_log_user_prompts_enabled =
            config.getTelemetryLogPromptsEnabled();
        this.file_filtering_respect_git_ignore =
            config.getFileFilteringRespectGitIgnore();
    }
}
export class EndSessionEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    session_id;
    constructor(config) {
        this['event.name'] = 'end_session';
        this['event.timestamp'] = new Date().toISOString();
        this.session_id = config?.getSessionId();
    }
}
export class UserPromptEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    prompt_length;
    prompt_id;
    auth_type;
    prompt;
    constructor(prompt_length, prompt_Id, auth_type, prompt) {
        this['event.name'] = 'user_prompt';
        this['event.timestamp'] = new Date().toISOString();
        this.prompt_length = prompt_length;
        this.prompt_id = prompt_Id;
        this.auth_type = auth_type;
        this.prompt = prompt;
    }
}
export class ToolCallEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    function_name;
    function_args;
    duration_ms;
    success;
    decision;
    error;
    error_type;
    prompt_id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata;
    constructor(call) {
        this['event.name'] = 'tool_call';
        this['event.timestamp'] = new Date().toISOString();
        this.function_name = call.request.name;
        this.function_args = call.request.args;
        this.duration_ms = call.durationMs ?? 0;
        this.success = call.status === 'success';
        this.decision = call.outcome
            ? getDecisionFromOutcome(call.outcome)
            : undefined;
        this.error = call.response.error?.message;
        this.error_type = call.response.errorType;
        this.prompt_id = call.request.prompt_id;
        if (call.status === 'success' &&
            typeof call.response.resultDisplay === 'object' &&
            call.response.resultDisplay !== null &&
            'diffStat' in call.response.resultDisplay) {
            const diffStat = call.response.resultDisplay.diffStat;
            if (diffStat) {
                this.metadata = {
                    ai_added_lines: diffStat.ai_added_lines,
                    ai_removed_lines: diffStat.ai_removed_lines,
                    user_added_lines: diffStat.user_added_lines,
                    user_removed_lines: diffStat.user_removed_lines,
                };
            }
        }
    }
}
export class ApiRequestEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    model;
    prompt_id;
    request_text;
    constructor(model, prompt_id, request_text) {
        this['event.name'] = 'api_request';
        this['event.timestamp'] = new Date().toISOString();
        this.model = model;
        this.prompt_id = prompt_id;
        this.request_text = request_text;
    }
}
export class ApiErrorEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    model;
    error;
    error_type;
    status_code;
    duration_ms;
    prompt_id;
    auth_type;
    constructor(model, error, duration_ms, prompt_id, auth_type, error_type, status_code) {
        this['event.name'] = 'api_error';
        this['event.timestamp'] = new Date().toISOString();
        this.model = model;
        this.error = error;
        this.error_type = error_type;
        this.status_code = status_code;
        this.duration_ms = duration_ms;
        this.prompt_id = prompt_id;
        this.auth_type = auth_type;
    }
}
export class ApiResponseEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    model;
    status_code;
    duration_ms;
    error;
    input_token_count;
    output_token_count;
    cached_content_token_count;
    thoughts_token_count;
    tool_token_count;
    total_token_count;
    response_text;
    prompt_id;
    auth_type;
    constructor(model, duration_ms, prompt_id, auth_type, usage_data, response_text, error) {
        this['event.name'] = 'api_response';
        this['event.timestamp'] = new Date().toISOString();
        this.model = model;
        this.duration_ms = duration_ms;
        this.status_code = 200;
        this.input_token_count = usage_data?.promptTokenCount ?? 0;
        this.output_token_count = usage_data?.candidatesTokenCount ?? 0;
        this.cached_content_token_count = usage_data?.cachedContentTokenCount ?? 0;
        this.thoughts_token_count = usage_data?.thoughtsTokenCount ?? 0;
        this.tool_token_count = usage_data?.toolUsePromptTokenCount ?? 0;
        this.total_token_count = usage_data?.totalTokenCount ?? 0;
        this.response_text = response_text;
        this.error = error;
        this.prompt_id = prompt_id;
        this.auth_type = auth_type;
    }
}
export class FlashFallbackEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    auth_type;
    constructor(auth_type) {
        this['event.name'] = 'flash_fallback';
        this['event.timestamp'] = new Date().toISOString();
        this.auth_type = auth_type;
    }
}
export var LoopType;
(function (LoopType) {
    LoopType["CONSECUTIVE_IDENTICAL_TOOL_CALLS"] = "consecutive_identical_tool_calls";
    LoopType["CHANTING_IDENTICAL_SENTENCES"] = "chanting_identical_sentences";
    LoopType["LLM_DETECTED_LOOP"] = "llm_detected_loop";
})(LoopType || (LoopType = {}));
export class LoopDetectedEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    loop_type;
    prompt_id;
    constructor(loop_type, prompt_id) {
        this['event.name'] = 'loop_detected';
        this['event.timestamp'] = new Date().toISOString();
        this.loop_type = loop_type;
        this.prompt_id = prompt_id;
    }
}
export class NextSpeakerCheckEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    prompt_id;
    finish_reason;
    result;
    constructor(prompt_id, finish_reason, result) {
        this['event.name'] = 'next_speaker_check';
        this['event.timestamp'] = new Date().toISOString();
        this.prompt_id = prompt_id;
        this.finish_reason = finish_reason;
        this.result = result;
    }
}
export class SlashCommandEvent {
    'event.name';
    'event.timestamp'; // ISO 8106
    command;
    subcommand;
    constructor(command, subcommand) {
        this['event.name'] = 'slash_command';
        this['event.timestamp'] = new Date().toISOString();
        this.command = command;
        this.subcommand = subcommand;
    }
}
export class MalformedJsonResponseEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    model;
    constructor(model) {
        this['event.name'] = 'malformed_json_response';
        this['event.timestamp'] = new Date().toISOString();
        this.model = model;
    }
}
export var IdeConnectionType;
(function (IdeConnectionType) {
    IdeConnectionType["START"] = "start";
    IdeConnectionType["SESSION"] = "session";
})(IdeConnectionType || (IdeConnectionType = {}));
export class IdeConnectionEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    connection_type;
    constructor(connection_type) {
        this['event.name'] = 'ide_connection';
        this['event.timestamp'] = new Date().toISOString();
        this.connection_type = connection_type;
    }
}
//# sourceMappingURL=types.js.map