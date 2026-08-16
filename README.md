# jong_portfolio

```
web/    portfolio site — React 19, TypeScript, Tailwind v4, Vite+
api/    contact backend — Python 3.13, FastAPI, uv
```

Two independent projects. Neither builds the other; the only coupling is
`VITE_CONTACT_API_URL` in `web/`, pointing at a running `api/`.

## Run both

```sh
cd api && cp .env.example .env && uv run serve   # :8000
cd web && npm install && npm run dev             # :5173
```

The email and resume links call the API — they do nothing without it running,
which is deliberate. Neither value ships in the frontend bundle.

## Checks

```sh
cd web && npm run check && npm run test && npm run test:e2e
cd api && uv run ruff check . && uv run pytest
```

The browser suite stubs the API, so it needs no backend, no AWS, and no network.

## Deploying

`web/` is a static bundle — S3 behind CloudFront, with an ACM certificate in
`us-east-1` and DNS in Route 53. Routing is hash-based (`#/systems/<id>`), so no
rewrite rules are needed. Cache `/assets/*` as immutable and `index.html` as
`no-cache`.

`api/` is a plain ASGI app and goes wherever you like. See [api/README.md](api/README.md).
