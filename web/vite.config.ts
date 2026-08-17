import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { Marked } from 'marked'
import { createHighlighter, type Highlighter } from 'shiki'
import { defineConfig, type Plugin } from 'vite-plus'

const THEMES = { light: 'github-light', dark: 'github-dark' } as const

const LANGS = [
    'bash',
    'diff',
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

/** Anything the browser can already resolve on its own is left alone. */
const EXTERNAL = /^(https?:)?\/\/|^data:|^\//

/** NUL cannot appear in rendered HTML, so a slot marker can never collide with content. */
const SLOT = /\0(\d+)\0/

const escapeAttr = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const slug = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^\w]+/g, '-')
        .replace(/^-|-$/g, '')

function render(source: string, shiki: Highlighter, assets: string[]) {
    const md = new Marked({
        renderer: {
            // A relative src becomes a real import, so Vite hashes the file and fails the
            // build on a typo. Left as a plain string it would resolve against the page
            // URL -- /systems/<id>/x.png -- and 404 in production, silently.
            image({ href, text, title }) {
                if (EXTERNAL.test(href)) return false

                const slot = assets.push(href) - 1
                const caption = title ? ` title="${escapeAttr(title)}"` : ''
                return `<img src="\0${slot}\0" alt="${escapeAttr(text)}"${caption}>`
            },

            // Only h2 is anchored, because only h2 is what the page outline tracks.
            heading({ tokens, depth }) {
                const html = this.parser.parseInline(tokens)
                if (depth !== 2) return `<h${depth}>${html}</h${depth}>`
                return `<h2 id="${slug(html.replace(/<[^>]+>/g, ''))}">${html}</h2>`
            },

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

            // Files keep their own H1 so the raw markdown reads as a document on its
            // own, but the page renders the title from data — where the catalogue
            // pages already need it — so the heading is dropped here.
            const source = code.replace(/^#\s+.+\r?\n+/, '')

            const assets: string[] = []
            // A table is the one block that cannot reflow on a phone, so it gets a
            // scrolling parent instead of pushing the whole page sideways.
            const html = render(source, await highlighter(), assets)
                .replaceAll('<table>', '<div class="article-scroll"><table>')
                .replaceAll('</table>', '</table></div>')

            if (assets.length === 0) {
                return { code: `export default ${JSON.stringify(html)}`, map: null }
            }

            // Splitting on the slot markers interleaves the literal chunks with the
            // imported URLs, so the asset graph gets real edges and Vite handles
            // hashing, the inline-limit and dev serving exactly as it would anywhere.
            const imports = assets.map(
                (href, index) => `import a${index} from ${JSON.stringify(href)}`,
            )
            const body = html
                .split(SLOT)
                .map((part, index) => (index % 2 ? `a${part}` : JSON.stringify(part)))
                .join(' + ')

            return { code: `${imports.join('\n')}\nexport default ${body}`, map: null }
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
