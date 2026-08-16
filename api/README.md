# portfolio-api

Holds the two things that must not ship to a browser — the email address and read
access to the resume — and hands either one over only after a Turnstile token
checks out.

```
POST /email    -> { "value": "you@example.com" }
POST /resume   -> { "value": "https://bucket.s3.../Resume.pdf?X-Amz-Signature=..." }
```

Both POST routes take `{ "token": "<turnstile token>" }`. The resume link is
presigned and expires in 60 seconds, so the S3 bucket stays private and a
forwarded link is dead by the time anyone else opens it.

## Run it

```sh
cp .env.example .env
uv run serve          # http://localhost:8000, reloads on change
uv run pytest
uv run ruff check .
```

## Deploy

Any Python host works — this is a plain ASGI app with no edge-runtime
assumptions. Point `VITE_CONTACT_API_URL` in `web/.env.production` at it and set
`ALLOWED_ORIGINS` to the live site origin.

```sh
uv run uvicorn portfolio_api.main:create_app --factory --host 0.0.0.0 --port 8000
```

The resume lives in a **private** bucket — not the one serving the site. Give the
API an IAM identity with exactly one permission, so a leaked key reads one file:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::jong-private/Jonathan_Ong_Resume.pdf"
        }
    ]
}
```

## Behaviour worth knowing

- **Turnstile outage fails open.** If siteverify is unreachable, times out, or
  answers 5xx, the request is served anyway — an outage on Cloudflare's side is
  not the visitor's problem. A token siteverify actively *rejects* is still
  refused.
- **A missing token is refused.** The widget never ran, which is what a scraper
  hitting the endpoint directly looks like.
- **There is no fallback if the API is down.** Nothing on the page can stand in
  for it, because the address and the signed URL only exist here. The GitHub and
  LinkedIn links are the way through.
- Presigned URLs are time-limited, not single-use. 60 seconds is the window, set
  by `LINK_TTL`.
- The dev secret accepts **any** token, so a rejected-token path cannot be
  exercised locally. `uv run pytest` covers it against a mocked siteverify.
