/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export type FileSearchOptions = {
    projectRoot: string;
    ignoreDirs: string[];
    useGitignore: boolean;
    useGeminiignore: boolean;
    cache: boolean;
    cacheTtl: number;
    maxDepth?: number;
};
export declare class AbortError extends Error {
    constructor(message?: string);
}
/**
 * Filters a list of paths based on a given pattern.
 * @param allPaths The list of all paths to filter.
 * @param pattern The picomatch pattern to filter by.
 * @param signal An AbortSignal to cancel the operation.
 * @returns A promise that resolves to the filtered and sorted list of paths.
 */
export declare function filter(allPaths: string[], pattern: string, signal: AbortSignal | undefined): Promise<string[]>;
export type SearchOptions = {
    signal?: AbortSignal;
    maxResults?: number;
};
/**
 * Provides a fast and efficient way to search for files within a project,
 * respecting .gitignore and .geminiignore rules, and utilizing caching
 * for improved performance.
 */
export declare class FileSearch {
    private readonly options;
    private readonly absoluteDir;
    private readonly ignore;
    private resultCache;
    private allFiles;
    private fzf;
    /**
     * Constructs a new `FileSearch` instance.
     * @param options Configuration options for the file search.
     */
    constructor(options: FileSearchOptions);
    /**
     * Initializes the file search engine by loading ignore rules, crawling the
     * file system, and building the in-memory cache. This method must be called
     * before performing any searches.
     */
    initialize(): Promise<void>;
    /**
     * Searches for files matching a given pattern.
     * @param pattern The picomatch pattern to search for (e.g., '*.js', 'src/**').
     * @param options Search options, including an AbortSignal and maxResults.
     * @returns A promise that resolves to a list of matching file paths, relative
     *          to the project root.
     */
    search(pattern: string, options?: SearchOptions): Promise<string[]>;
    /**
     * Loads ignore rules from .gitignore and .geminiignore files, and applies
     * any additional ignore directories specified in the options.
     */
    private loadIgnoreRules;
    /**
     * Crawls the file system to get a list of all files and directories,
     * optionally using a cache for faster initialization.
     */
    private crawlFiles;
    /**
     * Performs the actual file system crawl using `fdir`, applying directory
     * ignore rules.
     * @returns A promise that resolves to a list of all files and directories.
     */
    private performCrawl;
    /**
     * Builds the in-memory cache for fast pattern matching.
     */
    private buildResultCache;
}
