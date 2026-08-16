# jong_portfolio

```
web/    portfolio site — React 19, TypeScript, Tailwind v4, Vite+
api/    contact backend — Python 3.13, FastAPI, uv
```

Two independent projects. Neither builds the other; the only coupling is
`VITE_CONTACT_API_URL` in `web/`, pointing at a running `api/`.

## Run both

```sh
cd api && cp .env.example .env.staging && uv run serve   # :8000
cd web && npm install && npm run dev                     # :5173
```

The contact form posts to the API and renders disabled without it, which is
deliberate — the destination address never ships in the frontend bundle. The
resume is a static asset and the profile links are plain anchors, so those keep
working whether or not the backend is up.

## Checks

```sh
cd web && npm run check && npm run test:e2e
cd api && uv run ruff check . && uv run pytest
```

The browser suite stubs the API, so it needs no backend, no AWS, and no network.
There are no unit tests in `web/` yet — `npm run test` is wired up but finds
nothing, so it exits non-zero.

## Deploying

`web/` is a static bundle — S3 behind CloudFront, with an ACM certificate in
`us-east-1` and DNS in Route 53. Cache `/assets/*` as immutable and `index.html`
as `no-cache`.

**Routing needs a rewrite rule.** Paths are real (`/projects/portfolio`, not
`#/projects/portfolio`), so a deep link asks the origin for a key that does not
exist. Without a fallback, every URL except `/` returns an error and only
in-app clicks work. On CloudFront, add two custom error responses:

| HTTP error code | Response page path | HTTP response code |
|---|---|---|
| 403 | `/index.html` | 200 |
| 404 | `/index.html` | 200 |

403 matters as much as 404: with an origin access control, S3 answers a missing
key with `AccessDenied`, not `NoSuchKey`. Most other hosts — Cloudflare Pages,
Netlify, Vercel — do this by default or with one line of config.

The app answers unknown paths itself with a not-found view, so mapping
everything to `index.html` does not turn typos into a silent home page.

`api/` is a plain ASGI app and goes wherever you like. See [api/README.md](api/README.md).
