# I Put a Captcha on the Wrong Thing

## The mailto: problem

The spam calls and scam-recruiter messages I already get came from somewhere. Address lists get assembled, sold, and resold, and every public plaintext email is one more row in somebody's CSV. A portfolio site with `mailto:jonathan@...` on it is a self-inflicted version of the same problem: I'd be volunteering for the thing I'm already annoyed about.

So I wanted a portfolio that shows a way to reach me to a person and nothing to a crawler. That sounds like a small problem. The interesting part turned out to be that my first answer was wrong in a way that took measuring to see.

## What I built first

Two endpoints behind a Cloudflare Turnstile check. Click "email", an invisible captcha runs, the token goes to a FastAPI service, siteverify approves it, and the API hands back the address. Same for the resume, except the API returned a 60-second presigned S3 URL so the PDF could live in a private bucket.

The part I got right was that **neither value shipped to the browser.** That still matters, and it's worth being explicit about the option I rejected, because it's the one most static-site tutorials reach for: putting the email in a build-time environment variable. Vite, Next, Astro all make this easy, and it feels like a secret because it lives in a `.env` file and a CI secret store.

It isn't. Build-time injection means the value is _baked into the artifact you upload to the CDN._ One `grep` of the minified output finds it:

```bash
curl -s https://yoursite.com/assets/index-a3f9c2.js | grep -o '[a-zA-Z0-9._%+-]\+@[a-zA-Z0-9.-]\+'
```

Anything in the bundle is already public. Obfuscation — reversing the string, base64, splitting it across variables and joining at runtime — raises the cost from one grep to about four minutes of reading, which is not a meaningful threat model against anyone who wants it. If the value must stay private, it has to live somewhere the client never receives, which means a server.

That reasoning holds. The captcha bolted on top of it did not.

## The question I hadn't asked

I spent a long time on what should happen when Turnstile itself is unavailable, and wrote a decision table for it: refuse a missing token, refuse a token Cloudflare actively rejects, serve anyway when siteverify is unreachable or answers 5xx. The logic was sound. The reasoning behind it was careful. And it was all downstream of a question I never asked, which is **what exactly is the captcha stopping?**

Two mechanisms were doing work here, and I had quietly merged them:

1. The values aren't in the bundle. They live behind an API.
2. Turnstile.

So subtract the second and look at what's left. To get my address, a harvester now has to execute my JavaScript, find the string `/email` in a minified bundle, discover the API base URL, construct a `POST` with a JSON body, and parse the response.

Harvesters do none of that. They fetch HTML and regex for `@`. They don't run JS, don't inventory XHR endpoints, don't synthesize POST requests. Even the crawlers that _do_ render pages follow links — they don't invent API calls against an origin they've never seen.

**Essentially all of the protection came from step one.** Turnstile was guarding a door that only opened for someone who had already reverse-engineered the building, and my own write-up admitted that such a person defeats it for a fraction of a cent at a solving service. I had added a dependency, a decision table, and an availability risk in order to inconvenience an attacker who does not exist, while the thing actually protecting me was a design decision that cost nothing.

## Moving the check to where the bots are

The fix wasn't to delete the captcha. It was to point it at traffic that is genuinely automated and genuinely high volume: **form submissions.**

So the reveal endpoints went away entirely. In their place, a contact form — and my address is never sent to the browser under any circumstance — not gated, not encoded, not fetched. It is a destination the server writes to, and the visitor never touches it:

```python
class Message(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=1, max_length=4000)
    token: str | None = None


@app.post("/contact", status_code=204)
async def contact(request: Request, body: Message) -> Response:
    if not await passed(body.token, client_ip(request), settings.turnstile_secret):
        raise HTTPException(status_code=403, detail="unverified")

    send(settings, body.name, body.email, body.message[: settings.max_message])
    return Response(status_code=204)
```

That is the version with the captcha still in it; hold that thought. The route returns `204`. There is no body, so there is nothing to leak even by accident — a test asserts the destination address appears nowhere in any response. Mail goes out through SES from a verified identity with the visitor's address in `Reply-To`, because sending _as_ them would be a spoof and SES would refuse it anyway.

Contact-form spam is the case captchas were built for. Drive-by bots hit every form they can find, they submit constantly, and they cost real money when the form is wired to a mail service. That is a threat with volume behind it, unlike the email-reveal scraper I had been imagining.

## The same outage, the opposite answer

Here's the part I find most interesting, because the code barely changed and the correct behaviour inverted.

Under the old design, verification **failed open**: if siteverify was unreachable or returned 5xx, the request was served anyway. That was right. A hiring manager clicking "email" during a Cloudflare incident should not be told to go away, and the downside of wrongly allowing was that a scraper got an address I'd already published on GitHub.

Under the new design, the same branch is wrong. The door no longer leads to a value the visitor was about to be handed — it leads to my inbox, and to a service that sends mail on my behalf. Serving through an outage reopens exactly the hole the check exists to close, and does it at the worst possible moment, because an outage is not a quiet period for bots. So it **fails closed**:

```python
async def passed(token: str | None, remote_ip: str | None, secret: str) -> bool:
    if not token:
        return False

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                SITEVERIFY,
                json={"secret": secret, "response": token, "remoteip": remote_ip},
            )

        return response.json().get("success") is True
    except (httpx.HTTPError, ValueError):
        return False
```

The `except` clause is carrying more than it looks. A captive portal, a corporate middlebox, or a hotel wifi interstitial will answer `200` with an HTML login page over a connection that looks healthy at every layer below the body. `response.json()` raises `JSONDecodeError`, which subclasses `ValueError`, so it lands in the same branch as a timeout. Under the old design that degraded open; now it refuses, which is the conservative reading of "something answered, but it wasn't Cloudflare answering the question I asked."

What makes failing closed acceptable is that **the visitor now has somewhere else to go.** The original design had no fallback — the address and the signed URL existed nowhere but that endpoint, so a refusal was a dead end. Today the resume is a static file, the GitHub and LinkedIn links are plain anchors, and the form's error message says so out loud. The check can be completely broken and a recruiter still has three working routes to me.

That's the actual lesson, and it isn't "fail open" or "fail closed". It's that the right answer depends entirely on what is behind the door and whether there's another way around — and both of those changed underneath a function I hadn't edited.

## What I gave up

The resume is a static asset now. No private bucket, no presigned URLs, no `boto3`, no S3 credentials in the API — a `.pdf` in `public/`, linked directly.

This is a real concession and I want to be straight about it, because it's the one thing that got _less_ protected. A linked PDF at a stable URL is exactly what a crawler can fetch, which is the opposite of the POST-only JSON endpoint the argument above depends on. Everything I said about harvesters not synthesizing API calls stops applying the moment the thing is an `<a href>`.

I decided it was worth it, for two reasons. The presigned-URL machinery was a meaningful chunk of the codebase — a boto3 client, a TTL, a signing module, credentials to rotate — protecting a document whose entire employment history is already public on LinkedIn. And the part I actually cared about wasn't the history, it was the phone number. So I took the phone number off the web copy. A resume that lives on a site with a contact form doesn't need one.

There's a `robots.txt` disallow on the file, which stops the polite crawlers and precisely nothing else. I'm not counting it as security.

## And then I deleted that too

Everything above is what the code used to do. The captcha is gone now — not moved again, removed. No `turnstile.py`, no siteverify call, no widget in the bundle, no `TURNSTILE_SECRET`. `POST /contact` validates a body and sends mail.

The honest reason is that I ran my own argument one step further than I had the first time. I had already established that the check was worth roughly nothing on the reveal path. On the contact form it is worth something real — but "something real" has to be weighed against what it costs, and I never did that arithmetic. The cost was a third-party dependency in the request path, a service account, a dashboard, a decision table, an availability question, and a dummy-sitekey fixture in the test harness. The benefit was spam filtering on a form that **has never received a single submission, because the site is not deployed.**

I was buying insurance against a risk that does not exist yet, and paying for it in complexity I had to carry every time I touched the code.

So the endpoint is open. That is a decision with an expiry date, and I'd rather write the date down than pretend otherwise: before this points at a live domain, the form needs something in front of it. A honeypot field is about ten lines and adds no service dependency. A rate limit at the edge is better if there's already an edge. Either is a twenty-minute job at the point where it becomes necessary, which is exactly the point where I'll know which one fits.

What made that reversible was the shape of the thing, not the thing itself. The gate was one function with one call site, so removing it was a deletion rather than a migration.

## The takeaway

Three things, and the third only became visible in hindsight.

**Build-time secrets in a frontend bundle are not secrets.** If it ships to the browser it's public, and the only question is how long it takes someone to notice. That one held through every version of this and is the only conclusion here I'd defend unchanged.

**Before you add a check, write down what it stops that nothing else already stops.** I wrote a careful decision table, a fail-open policy, and a set of tests around a control that was defending a door nobody was trying. The analysis was rigorous and the premise was never examined.

**And then ask what it costs.** This is the one I missed twice. Moving the captcha somewhere it made sense felt like the correction, so I stopped there and shipped it. But a control that is worth _something_ is not automatically worth _keeping_ — it has to beat its own maintenance cost, against the actual risk, at the actual scale. Mine was defending an inbox that no one could reach yet.

Security work is unusually easy to feel good about, which is exactly why it needs the same scrutiny as everything else you'd delete without a second thought.
