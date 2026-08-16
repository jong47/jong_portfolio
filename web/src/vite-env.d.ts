interface ImportMetaEnv {
    readonly VITE_CHAT_API_URL?: string
    readonly VITE_TURNSTILE_SITE_KEY?: string
    readonly VITE_CONTACT_API_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module '*.md' {
    const html: string
    export default html
}
