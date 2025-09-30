// This file provides global type definitions for standard browser APIs
// that may not be available in the default TypeScript environment.
// This prevents widespread "Cannot find name" errors and eliminates
// the need for `(window as any)` or `(e.target as any)` casts.

// Provide type definitions for process.env, which is used for API keys.
// This avoids using `import.meta.env` which is not available in the runtime environment.
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly FIREBASE_API_KEY: string;
      readonly FIREBASE_AUTH_DOMAIN: string;
      readonly FIREBASE_PROJECT_ID: string;
      readonly FIREBASE_STORAGE_BUCKET: string;
      readonly FIREBASE_MESSAGING_SENDER_ID: string;
      readonly FIREBASE_APP_ID: string;
      readonly API_KEY: string;
    }
  }

  // By declaring this empty global scope, we hint to TypeScript that it should
  // include the default DOM library typings.
}

// React's JSX definition is global. We ensure it's here to avoid conflicts.
declare namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any;
    }
}

// Make this file a module to allow global augmentations.
export {};