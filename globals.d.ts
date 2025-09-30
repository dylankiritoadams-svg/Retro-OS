// This file provides global type definitions for Vite's environment variables.
// By defining the ImportMetaEnv interface, we provide TypeScript with knowledge
// of the `VITE_` prefixed variables that are available during the build process.
// This is the standard way to handle environment variables in a Vite project.

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Make this file a module to allow global augmentations.
export {};