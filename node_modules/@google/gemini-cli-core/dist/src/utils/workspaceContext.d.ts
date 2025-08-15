/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * WorkspaceContext manages multiple workspace directories and validates paths
 * against them. This allows the CLI to operate on files from multiple directories
 * in a single session.
 */
export declare class WorkspaceContext {
    private directories;
    private initialDirectories;
    /**
     * Creates a new WorkspaceContext with the given initial directory and optional additional directories.
     * @param initialDirectory The initial working directory (usually cwd)
     * @param additionalDirectories Optional array of additional directories to include
     */
    constructor(initialDirectory: string, additionalDirectories?: string[]);
    /**
     * Adds a directory to the workspace.
     * @param directory The directory path to add (can be relative or absolute)
     * @param basePath Optional base path for resolving relative paths (defaults to cwd)
     */
    addDirectory(directory: string, basePath?: string): void;
    /**
     * Internal method to add a directory with validation.
     */
    private addDirectoryInternal;
    private addInitialDirectoryInternal;
    /**
     * Gets a copy of all workspace directories.
     * @returns Array of absolute directory paths
     */
    getDirectories(): readonly string[];
    getInitialDirectories(): readonly string[];
    setDirectories(directories: readonly string[]): void;
    /**
     * Checks if a given path is within any of the workspace directories.
     * @param pathToCheck The path to validate
     * @returns True if the path is within the workspace, false otherwise
     */
    isPathWithinWorkspace(pathToCheck: string): boolean;
    /**
     * Checks if a path is within a given root directory.
     * @param pathToCheck The absolute path to check
     * @param rootDirectory The absolute root directory
     * @returns True if the path is within the root directory, false otherwise
     */
    private isPathWithinRoot;
}
