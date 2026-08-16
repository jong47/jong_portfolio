# portfolio-api

One route. It takes a contact-form message and mails it, so the destination address
never has to exist in the frontend bundle.

```
POST /contact  ->  204 No Content
```

```json
{ "name": "Dana", "email": "dana@example.com", "message": "Are you free to talk?" }
```

The response has no body on purpose — there is nothing to return, and nothing to leak
by accident. A test asserts the destination address appears in no response.

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
- **The endpoint is open.** There is no captcha and no rate limit. That is a deliberate
  choice for an undeployed personal site, not an oversight — see the note below.
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
