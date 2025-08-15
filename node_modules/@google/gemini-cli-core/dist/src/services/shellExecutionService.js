/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { spawn } from 'child_process';
import { TextDecoder } from 'util';
import os from 'os';
import stripAnsi from 'strip-ansi';
import { getCachedEncodingForBuffer } from '../utils/systemEncoding.js';
import { isBinary } from '../utils/textUtils.js';
const SIGKILL_TIMEOUT_MS = 200;
/**
 * A centralized service for executing shell commands with robust process
 * management, cross-platform compatibility, and streaming output capabilities.
 *
 */
export class ShellExecutionService {
    /**
     * Executes a shell command using `spawn`, capturing all output and lifecycle events.
     *
     * @param commandToExecute The exact command string to run.
     * @param cwd The working directory to execute the command in.
     * @param onOutputEvent A callback for streaming structured events about the execution, including data chunks and status updates.
     * @param abortSignal An AbortSignal to terminate the process and its children.
     * @returns An object containing the process ID (pid) and a promise that
     *          resolves with the complete execution result.
     */
    static execute(commandToExecute, cwd, onOutputEvent, abortSignal) {
        const isWindows = os.platform() === 'win32';
        const child = spawn(commandToExecute, [], {
            cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
            // Use bash unless in Windows (since it doesn't support bash).
            // For windows, just use the default.
            shell: isWindows ? true : 'bash',
            // Use process groups on non-Windows for robust killing.
            // Windows process termination is handled by `taskkill /t`.
            detached: !isWindows,
            env: {
                ...process.env,
                GEMINI_CLI: '1',
            },
        });
        const result = new Promise((resolve) => {
            // Use decoders to handle multi-byte characters safely (for streaming output).
            let stdoutDecoder = null;
            let stderrDecoder = null;
            let stdout = '';
            let stderr = '';
            const outputChunks = [];
            let error = null;
            let exited = false;
            let isStreamingRawContent = true;
            const MAX_SNIFF_SIZE = 4096;
            let sniffedBytes = 0;
            const handleOutput = (data, stream) => {
                if (!stdoutDecoder || !stderrDecoder) {
                    const encoding = getCachedEncodingForBuffer(data);
                    try {
                        stdoutDecoder = new TextDecoder(encoding);
                        stderrDecoder = new TextDecoder(encoding);
                    }
                    catch {
                        // If the encoding is not supported, fall back to utf-8.
                        // This can happen on some platforms for certain encodings like 'utf-32le'.
                        stdoutDecoder = new TextDecoder('utf-8');
                        stderrDecoder = new TextDecoder('utf-8');
                    }
                }
                outputChunks.push(data);
                // Binary detection logic. This only runs until we've made a determination.
                if (isStreamingRawContent && sniffedBytes < MAX_SNIFF_SIZE) {
                    const sniffBuffer = Buffer.concat(outputChunks.slice(0, 20));
                    sniffedBytes = sniffBuffer.length;
                    if (isBinary(sniffBuffer)) {
                        // Change state to stop streaming raw content.
                        isStreamingRawContent = false;
                        onOutputEvent({ type: 'binary_detected' });
                    }
                }
                const decodedChunk = stream === 'stdout'
                    ? stdoutDecoder.decode(data, { stream: true })
                    : stderrDecoder.decode(data, { stream: true });
                const strippedChunk = stripAnsi(decodedChunk);
                if (stream === 'stdout') {
                    stdout += strippedChunk;
                }
                else {
                    stderr += strippedChunk;
                }
                if (isStreamingRawContent) {
                    onOutputEvent({ type: 'data', stream, chunk: strippedChunk });
                }
                else {
                    const totalBytes = outputChunks.reduce((sum, chunk) => sum + chunk.length, 0);
                    onOutputEvent({ type: 'binary_progress', bytesReceived: totalBytes });
                }
            };
            child.stdout.on('data', (data) => handleOutput(data, 'stdout'));
            child.stderr.on('data', (data) => handleOutput(data, 'stderr'));
            child.on('error', (err) => {
                const { stdout, stderr, finalBuffer } = cleanup();
                error = err;
                resolve({
                    error,
                    stdout,
                    stderr,
                    rawOutput: finalBuffer,
                    output: stdout + (stderr ? `\n${stderr}` : ''),
                    exitCode: 1,
                    signal: null,
                    aborted: false,
                    pid: child.pid,
                });
            });
            const abortHandler = async () => {
                if (child.pid && !exited) {
                    if (isWindows) {
                        spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t']);
                    }
                    else {
                        try {
                            // Kill the entire process group (negative PID).
                            // SIGTERM first, then SIGKILL if it doesn't die.
                            process.kill(-child.pid, 'SIGTERM');
                            await new Promise((res) => setTimeout(res, SIGKILL_TIMEOUT_MS));
                            if (!exited) {
                                process.kill(-child.pid, 'SIGKILL');
                            }
                        }
                        catch (_e) {
                            // Fall back to killing just the main process if group kill fails.
                            if (!exited)
                                child.kill('SIGKILL');
                        }
                    }
                }
            };
            abortSignal.addEventListener('abort', abortHandler, { once: true });
            child.on('exit', (code, signal) => {
                const { stdout, stderr, finalBuffer } = cleanup();
                resolve({
                    rawOutput: finalBuffer,
                    output: stdout + (stderr ? `\n${stderr}` : ''),
                    stdout,
                    stderr,
                    exitCode: code,
                    signal,
                    error,
                    aborted: abortSignal.aborted,
                    pid: child.pid,
                });
            });
            /**
             * Cleans up a process (and it's accompanying state) that is exiting or
             * erroring and returns output formatted output buffers and strings
             */
            function cleanup() {
                exited = true;
                abortSignal.removeEventListener('abort', abortHandler);
                if (stdoutDecoder) {
                    stdout += stripAnsi(stdoutDecoder.decode());
                }
                if (stderrDecoder) {
                    stderr += stripAnsi(stderrDecoder.decode());
                }
                const finalBuffer = Buffer.concat(outputChunks);
                return { stdout, stderr, finalBuffer };
            }
        });
        return { pid: child.pid, result };
    }
}
//# sourceMappingURL=shellExecutionService.js.map