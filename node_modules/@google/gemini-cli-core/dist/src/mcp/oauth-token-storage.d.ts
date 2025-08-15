/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Interface for MCP OAuth tokens.
 */
export interface MCPOAuthToken {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    tokenType: string;
    scope?: string;
}
/**
 * Interface for stored MCP OAuth credentials.
 */
export interface MCPOAuthCredentials {
    serverName: string;
    token: MCPOAuthToken;
    clientId?: string;
    tokenUrl?: string;
    mcpServerUrl?: string;
    updatedAt: number;
}
/**
 * Class for managing MCP OAuth token storage and retrieval.
 */
export declare class MCPOAuthTokenStorage {
    private static readonly TOKEN_FILE;
    private static readonly CONFIG_DIR;
    /**
     * Get the path to the token storage file.
     *
     * @returns The full path to the token storage file
     */
    private static getTokenFilePath;
    /**
     * Ensure the config directory exists.
     */
    private static ensureConfigDir;
    /**
     * Load all stored MCP OAuth tokens.
     *
     * @returns A map of server names to credentials
     */
    static loadTokens(): Promise<Map<string, MCPOAuthCredentials>>;
    /**
     * Save a token for a specific MCP server.
     *
     * @param serverName The name of the MCP server
     * @param token The OAuth token to save
     * @param clientId Optional client ID used for this token
     * @param tokenUrl Optional token URL used for this token
     * @param mcpServerUrl Optional MCP server URL
     */
    static saveToken(serverName: string, token: MCPOAuthToken, clientId?: string, tokenUrl?: string, mcpServerUrl?: string): Promise<void>;
    /**
     * Get a token for a specific MCP server.
     *
     * @param serverName The name of the MCP server
     * @returns The stored credentials or null if not found
     */
    static getToken(serverName: string): Promise<MCPOAuthCredentials | null>;
    /**
     * Remove a token for a specific MCP server.
     *
     * @param serverName The name of the MCP server
     */
    static removeToken(serverName: string): Promise<void>;
    /**
     * Check if a token is expired.
     *
     * @param token The token to check
     * @returns True if the token is expired
     */
    static isTokenExpired(token: MCPOAuthToken): boolean;
    /**
     * Clear all stored MCP OAuth tokens.
     */
    static clearAllTokens(): Promise<void>;
}
