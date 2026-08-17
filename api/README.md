# portfolio-api

Two routes. One takes a contact-form message and mails it, so the destination address
never has to exist in the frontend bundle. The other is the front of a retrieval
chatbot over my work history.

```
POST /contact  ->  204 No Content
POST /chat     ->  200 { "reply": "..." }
```

```json
{ "name": "Dana", "email": "dana@example.com", "message": "Are you free to talk?" }
{ "message": "What did you build at Tax Relief Advocates?" }
```

The contact response has no body on purpose — there is nothing to return, and nothing
to leak by accident. A test asserts the destination address appears in no response.

## /chat

Only the top of the pipeline exists. A query is screened, then handed to a stub that
logs it and nothing else; the reply is a placeholder saying so.

```
query  ->  pre-checks  ->  dropped, logged, nothing spent
              |
              v
        embed and retrieve   <- a log line for now
              |
              v
           reply
```

Drops are refusals with real status codes, not polite replies:

| | | |
|---|---|---|
| `429` | over `CHAT_RATE_LIMIT` in `CHAT_RATE_WINDOW` | carries `Retry-After` |
| `422` | empty, or over `MAX_QUERY` characters | |

**Nothing a visitor typed is ever logged.** A drop records the reason, the client and a
character count — enough to tune the caps or spot abuse, and not enough to sit in a log
aggregator as somebody's words. A test sends a marker string and asserts it appears in
no record.

**The rate limit lives in one process.** It resets on restart and is counted per worker,
so two uvicorn workers means twice the effective limit. That is honest for a single
process in front of a personal site; a shared store is what makes it real.

**Identity is `request.client.host` and nothing else.** `X-Forwarded-For` is written by
the caller unless a proxy you own overwrites it, so reading it here would let anyone
reset their own limit by sending a new value. Putting a proxy in front of this means
adding an explicit trusted-proxy setting, not trusting a header.

Still to build: the similarity gate and its canned refusal, generation, and validating
that every id the model cites actually exists.

## Run it

```sh
cp .env.example .env.staging   # then fill it in
uv run serve                   # http://localhost:8000, reloads on change
uv run pytest
uv run ruff check .
```

`APP_ENV` picks the env file and defaults to `staging`, so config comes from
`.env.staging` unless you set `APP_ENV=prod`. A plain `.env` is never read.

## Deploy

A plain ASGI app with no edge-runtime assumptions, so any Python host works. Point
`VITE_CONTACT_API_URL` in `web/.env.prod` at it and set `ALLOWED_ORIGINS` to the live
site origin.

```sh
uv run uvicorn portfolio_api.main:create_app --factory --host 0.0.0.0 --port 8000
```

Mail goes out through SES. Both `SES_SENDER` and `CONTACT_EMAIL` must be verified
identities while the account is in the SES sandbox, which also caps you at 200 messages
a day. Give the API an identity with exactly one permission:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "ses:SendEmail",
            "Resource": "*"
        }
    ]
}
```

## Behaviour worth knowing

- **The visitor's address is never the sender.** SES would reject sending as an
  identity it has not verified, and it would be a spoof besides. Messages come from
  `SES_SENDER` with the visitor in `Reply-To`, so replying from the inbox reaches them.
- **`/contact` is open.** There is no captcha and no rate limit on it. That is a
  deliberate choice for an undeployed personal site, not an oversight — see the note
  below. `SlidingWindow` now exists for it to adopt.
- **Unknown fields are ignored,** not rejected, so a stale frontend posting an extra
  key does not turn every submit into a 422.
- **Messages are capped** at 4000 characters by the model and truncated to
  `MAX_MESSAGE` before sending.
- **CORS is an allowlist.** `ALLOWED_ORIGINS` is comma-separated; an origin not on it
  gets no `access-control-allow-origin` header back.

### On the missing spam guard

This route was behind a Cloudflare Turnstile check, which was removed along with the
rest of the Cloudflare integration. The reasoning: the site is not deployed, the web
app renders the form disabled unless `VITE_CONTACT_API_URL` is set, and SES sandbox
limits cap the blast radius anyway.

That reasoning expires at deploy time. Before pointing a public domain at this, put
something in front of the route — a honeypot field is about ten lines and adds no
service dependency; a rate limit at the edge is better if there is already an edge.
`ratelimit.SlidingWindow` covers the in-process case and is already wired to `/chat`.
