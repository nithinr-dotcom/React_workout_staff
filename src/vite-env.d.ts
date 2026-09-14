/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEST_TARGET?: 'reference' | 'solution';
  readonly VITE_FOLLOWUPS?: '1';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
