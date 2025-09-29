// This file provides global type definitions for standard browser APIs
// that may not be available in the default TypeScript environment.
// This prevents widespread "Cannot find name" errors and eliminates
// the need for `(window as any)` or `(e.target as any)` casts.

declare global {
  // By declaring this empty global scope, we hint to TypeScript that it should
  // include the default DOM library typings. We don't need to redeclare every
  // single DOM type here; this setup enables them.
}

// React's JSX definition is global. We ensure it's here to avoid conflicts.
declare namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any;
    }
}

// Make this file a module to allow global augmentations.
export {};
