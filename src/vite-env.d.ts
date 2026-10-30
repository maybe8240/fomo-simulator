interface ImportMetaEnv {
  readonly DEV: boolean
  readonly VITE_AI_ENABLED?: string
  readonly VITE_TURNS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg' {
  const content: string
  export default content
}
