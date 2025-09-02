// Global type definitions to fix TypeScript errors

// Node.js types
declare namespace NodeJS {
  interface Process {
    env: Record<string, string | undefined>;
  }
  interface Global {
    [key: string]: any;
  }
}

// Web API types
declare interface HeadersInit {
  [key: string]: string;
}

// Web Audio API types
declare type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

// Jest types for test files
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => void) => void;
declare const expect: any;
declare const beforeEach: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;
declare const beforeAll: (fn: () => void) => void;
declare const afterAll: (fn: () => void) => void;
declare const jest: any;
declare const global: any;
