interface ImportMetaEnv {
  readonly DEV: boolean
  readonly VITE_CLAUDE_API_KEY?: string
  readonly VITE_CLAUDE_BASE_URL?: string
  readonly VITE_CLAUDE_MODEL?: string
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
