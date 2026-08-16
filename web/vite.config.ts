import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { Marked } from 'marked'
import { createHighlighter, type Highlighter } from 'shiki'
import { defineConfig, type Plugin } from 'vite-plus'

const THEMES = { light: 'github-light', dark: 'github-dark' } as const

const LANGS = [
    'bash',
    'python',
    'typescript',
    'tsx',
    'javascript',
    'json',
    'yaml',
    'sql',
    'dockerfile',
]

// One highlighter for the whole build; loading the grammars is the expensive part.
let pending: Promise<Highlighter> | null = null

function highlighter() {
    pending ??= createHighlighter({ themes: Object.values(THEMES), langs: LANGS })
    return pending
}

function render(source: string, shiki: Highlighter) {
    const md = new Marked({
        renderer: {
            code({ text, lang }) {
                const language = (lang ?? '').trim().toLowerCase() || 'text'
                const known = shiki.getLoadedLanguages().includes(language)
                // defaultColor: false emits --shiki-light / --shiki-dark custom
                // properties instead of a baked colour, so one build serves both
                // themes and the toggle needs no second copy of the markup.
                const block = shiki.codeToHtml(text, {
                    lang: known ? language : 'text',
                    themes: THEMES,
                    defaultColor: false,
                })
                return `<figure class="code"><figcaption>${language}</figcaption>${block}</figure>`
            },
        },
    })

    return md.parse(source, { async: false })
}

// Articles stay as .md on disk and become HTML strings at build time, so neither a
// markdown parser nor a syntax highlighter ships to the browser. Content is authored
// in this repository, never by a visitor, which is what makes rendering it as HTML safe.
function markdown(): Plugin {
    return {
        name: 'markdown-to-html',
        // Must run before vite:import-analysis, which otherwise tries to parse the
        // markdown as JavaScript and fails.
        enforce: 'pre',
        async transform(code, id) {
            if (!id.endsWith('.md')) return null
            // A table is the one block that cannot reflow on a phone, so it gets a
            // scrolling parent instead of pushing the whole page sideways.
            const html = render(code, await highlighter())
                .replaceAll('<table>', '<div class="article-scroll"><table>')
                .replaceAll('</table>', '</table></div>')
            return { code: `export default ${JSON.stringify(html)}`, map: null }
        },
    }
}

// https://viteplus.dev/guide
export default defineConfig({
    base: '/',
    plugins: [react(), tailwindcss(), markdown()],

    // Lint config belongs here too — Vite+ does not read .oxlintrc.json.
    // typeCheck makes `vp check` fail on type errors, so types can't drift
    // unnoticed (vp build alone does not typecheck).
    // https://viteplus.dev/guide/lint
    lint: {
        ignorePatterns: ['dist/**'],
        options: {
            typeAware: true,
            typeCheck: true,
        },
    },

    // Formatting lives here rather than in .oxfmtrc.json, which Vite+ ignores.
    // https://viteplus.dev/guide/fmt
    fmt: {
        tabWidth: 4,
        useTabs: false,
        printWidth: 90,
        singleQuote: true,
        jsxSingleQuote: false,
        semi: false,
        trailingComma: 'all',
    },
})
