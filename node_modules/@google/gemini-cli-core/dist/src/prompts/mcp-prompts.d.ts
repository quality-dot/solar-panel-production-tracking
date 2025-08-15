/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
import { DiscoveredMCPPrompt } from '../tools/mcp-client.js';
export declare function getMCPServerPrompts(config: Config, serverName: string): DiscoveredMCPPrompt[];
