import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Polyfill structuredClone for Node.js test environment
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(...classNames: string[]): R;
      toHaveAttribute(attr: string, value?: string): R;
      toBeChecked(): R;
      toBeDisabled(): R;
      toHaveValue(value: string | number | string[]): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveDisplayValue(value: string | string[]): R;
    }
  }
}

// Mock ResizeObserver if it's not available in jsdom
global.ResizeObserver = global.ResizeObserver || jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver if it's not available in jsdom
global.IntersectionObserver = global.IntersectionObserver || jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia if it's not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
