/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute API origin for split deployments; empty means same-origin. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
