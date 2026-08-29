# portfolio-api

Two routes. One takes a contact-form message and mails it, so the destination address
never has to exist in the frontend bundle. The other is a streaming chatbot over my
work history.

```
POST /contact  ->  204 No Content
POST /chat     ->  200 text/plain, chunked
```

```json
{ "name": "Dana", "email": "dana@example.com", "message": "Are you free to talk?" }
{ "message": "What did you build at Tax Relief Advocates?", "posting": "optional job posting", "token": "optional turnstile token" }
```

The contact response has no body on purpose — there is nothing to return, and nothing
to leak by accident. A test asserts the destination address appears in no response.

## /chat

The reply is not JSON. The body **is** the answer, streamed as UTF-8 text in chunked
transfer encoding, and the stream closing is the only end-of-message signal. Plain text
rather than SSE: there is one kind of event, so framing would buy nothing and would
force newline-heavy prose to be split across `data:` lines and reassembled.

```
query -> captcha -> screen -> guardrail -> model -> streamed tokens
            |         |          |
            v         v          v
          403      streamed   streamed
                   refusal    intervention
```

Everything that can refuse runs before the first byte, which is what makes a real
status code still possible. Once a `200` is committed the status is spent, so a failure
after that point appends an apologetic sentence instead and logs the cause server-side.

### The character screen

`screen()` rejects a query whose codepoints fall in Unicode categories `Cc` (control),
`Cf` (format), `Cs` (surrogate), `Co` (private use) or `Cn` (unassigned), with newline
and tab allowed through. That is the invisible-prompt-injection alphabet: zero-width
spaces, bidirectional overrides, Unicode tag characters, byte order marks, soft hyphens.
Everything visible passes — every script, accents, CJK, emoji, smart punctuation, maths
symbols.

Nothing is normalised or rewritten. The text is validated exactly as typed and then
either used or dropped.

**Known tradeoff:** blocking `Cf` also blocks zero-width joiners, so multi-person emoji
sequences like 👨‍👩‍👧 are rejected. Relaxing that means allowlisting `U+200D` and
`U+FE0F`.

### Refusals are streamed, not error codes

A query refused on content — empty, over the cap, unreadable characters, or blocked by
a Bedrock guardrail — returns `200` and streams a canned sentence. The visitor reads a
reply in the chat bubble rather than seeing a failed request.

Errors are still errors: a malformed body is a `422` from pydantic, and a failed
captcha is a `403`. Both are conditions no real browser session produces.

Every refusal is logged by reason regardless of the status code, so a `200` never hides
a drop from the metrics.

**Nothing a visitor typed is ever logged.** A drop records the reason, the offending
Unicode categories and two counts:

```
dropped query: reason=unsupported categories=Cf offenders=2 chars=812
```

Enough to tune the caps or spot an attack, and not enough to sit in a log aggregator as
somebody's words. A test sends a marker string and asserts it appears in no record.

**No contact details reach the model.** `prompt.py` carries the work history and
deliberately omits any phone number or email address, and the system prompt forbids
disclosing or guessing one. A chatbot recites whatever it is given to anyone who asks
politely; the contact form exists so that address never has to be published.

### Token budget

| | tokens |
|---|---|
| corpus | ~1,150 |
| style rules | ~430 |
| match instructions (only with a posting) | ~90 |
| query (1,000 char cap) | ≤250 |
| **input, question only** | **~1,830** |
| **input, with a 6,000 char posting** | **~3,330** |
| output ceiling (`maxTokens`) | 3,000 |

Single turn, no history — persistence is not needed for this, and it is what keeps the
input side predictable.

## Run it

```sh
cp .env.example .env.staging   # then fill it in
uv run serve                   # http://localhost:8000, reloads on change
make test                      # pytest + ruff check + ruff format --check
```

`APP_ENV` picks the env file and defaults to `staging`. A plain `.env` is never read.

Verify streaming actually streams, rather than trusting that it does:

```sh
make stream      # tokens should appear progressively, not all at once
make buffering   # first_byte should be ~0.00s against a much larger total
```

```
first_byte=0.002869s total=3.312894s
```

If `first_byte` and `total` are close, something between you and the app is buffering.

## Local testing and Lambda

Under the Lambda Web Adapter the deployed process is `uvicorn` serving this exact
FastAPI app, so **`uv run serve` runs the same code path as production.** That is the
whole reason for choosing the adapter over a handler-shaped framework.

`sam local` cannot help here, and it is worth knowing why rather than debugging it:

- `sam local invoke` does not start external extensions, so the adapter never runs.
- Neither `sam local invoke` nor `sam local start-api` implements response streaming,
  so a streamed reply gets buffered or fails.

`sam build` is still worth running — it validates packaging, the Linux/arm64 wheels and
`run.sh` — and after a deploy `aws lambda invoke-with-response-stream` shows real
`PayloadChunk` events.

One genuine local/deployed difference: locally, a client disconnect cancels the
generator and the work stops. On Lambda a streamed response is **billed for the full
duration and is not interrupted** when the caller goes away. The bound is `maxTokens`
and the function timeout, not the visitor's patience.

## Deploy

The template lives in [`../infra/api/`](../infra/README.md), alongside the site hosting
and account bootstrap stacks, and a push to `main` deploys it. To drive it by hand:

```sh
cd ../infra/api
sam build
sam deploy --guided
```

`make validate` from this directory lints that template without leaving the api.

Zip packaged, `arm64`, `python3.13`, with the Lambda Web Adapter attached as a public
layer. `Handler` is `run.sh` — under the adapter that field names a startup script, not
a Python symbol, because there is no Lambda handler function at all.

The front door is an API Gateway **REST** API with `responseTransferMode: STREAM` on
`POST /chat`. HTTP APIs cannot stream; REST APIs can, and keeping a gateway is what
preserves per-route throttling as configuration.

### Model access

`bedrock_model_id` defaults to the cross-region inference profile
`us.anthropic.claude-haiku-4-5-20251001-v1:0`. Claude Haiku 4.5 has **no on-demand
throughput** — `inferenceTypesSupported` is `INFERENCE_PROFILE` only — so the bare
foundation-model id will not invoke. Model access must also be granted in the Bedrock
console, or every call returns:

```
ValidationException: Error 002: Access to Bedrock models is not allowed for this account
```

### Why us-west-2

The profile routes across `us-east-1`, `us-east-2` and `us-west-2`, so the endpoint
region does not decide where inference physically runs. It is set to Oregon anyway
because that is the lowest grid carbon intensity of the three — the Pacific Northwest
runs largely on Columbia River hydro, where Northern Virginia is a mixed gas-and-nuclear
grid. AWS reports both as 100% renewable, but that is annual *matching*, not what is
burning on the local grid. Oregon is also the lower-latency call from Irvine.

## Rate limiting

In place now, all configuration and no cost:

- Gateway throttling per route: `/chat` 5 rps burst 10, `/contact` 1 rps burst 3.
  Throttled requests are rejected before invocation, so a flood costs nothing.
- `ReservedConcurrentExecutions: 10`, which caps blast radius and returns `429` past it.
- The client will not submit while a stream is open, which debounces submit-cancel-repeat.
- A Turnstile seam, inert until `TURNSTILE_SECRET` is set.

These are aggregate ceilings, not per-visitor fairness: one abuser can exhaust the
`/chat` bucket and everyone else shares the `429`s.

### Before a public domain points at this

- [ ] AWS WAF web ACL with a rate-based per-IP rule on the REST stage (~$6.60/month:
      $5 per ACL, $1 per rule, $0.60 per million requests). This is where the 1m/5m/15m
      windows and IP blocklists belong.
- [ ] Real Turnstile keys, both `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET`.
- [ ] A Bedrock guardrail, set via `GUARDRAIL_ID`.
- [ ] A billing alarm. Streamed responses bill for full duration even when abandoned.
- [ ] Confirm the pinned LWA layer version is still current.
- [ ] SES identities verified for both `SES_SENDER` and `CONTACT_EMAIL`.

## Answers to the design questions

**Can guardrail egress be avoided on every query?** Yes. `guardrailConfig` attaches to
the same `converse_stream` call, so input policies evaluate inside the one model
request. There is no separate `ApplyGuardrail` hop, and an intervention arrives as
streamed text — which is exactly the refusal style already chosen.

**p80/p90/p95/p99?** Not knowable before deploying. Duration and token counts are logged
per request, so CloudWatch Logs Insights can compute percentiles once there is traffic.
OpenTelemetry and LiteLLM are worth revisiting then, not now.

**How do cancelled jobs work on Lambda?** You do not drop jobs, you bound them. A
disconnect does not stop a deployed stream; it runs to completion inside `maxTokens` and
the timeout, costing a fraction of a cent. That is why no control plane, job broker or
EKS is warranted here — the thing being cancelled is cheaper than the machinery to
cancel it.

**Budgeting context across turns?** Moot at one turn. When history arrives, truncate to
a token budget and enforce it server-side by construction rather than trusting the
client.

**Could the resume just be injected instead of RAG?** That is what happens. The whole
corpus is ~1,150 tokens and lives in `prompt.py`. RAG earns its complexity only once the
detailed write-ups are in scope.

**Should a job posting be a link instead of pasted text?** No. Fetching a
visitor-supplied URL server-side is SSRF — the Lambda runtime API and the app's own
`localhost` port are both reachable from inside the execution environment — and it hands
a stranger complete control of the model's input, bypassing the very screen that exists
to stop that. It is also unreliable: LinkedIn and Indeed postings sit behind auth walls
and JS rendering, so a fetch usually returns a login page. Pasted text keeps the content
inside the screen and adds no network egress.

## Module layout

| file | concern |
|---|---|
| `app.py` | initialisation only: settings, CORS, router mounting, `serve()` |
| `routes.py` | request models and the two route handlers |
| `screen.py` | the character and length screen, drop reasons, refusal text |
| `prompt.py` | the corpus, the style rules and the job-match instructions |
| `bedrock.py` | the `converse_stream` call and its usage logging |
| `turnstile.py` | captcha verification, via stdlib `urllib` |
| `mail.py` | SES send |
| `config.py` | `Settings` |
| `logger.py` | logging init |

## The original design spec

Kept verbatim. This is what the implementation above was built from; where the two
disagree, this document records the intent and the code records what shipped.

```text

hard requirements:
    - user query is free-form, capped at 500 - 1,000 characters.
    - token input is capped at 2,000 tokens (flexible).
    - token output is capped at 3,000 tokens (flexible).
    - entire budget is roughly 5,000 tokens (maximum of 10,000 tokens).
    - if we implement bedrock guardrails, this is essentially an intermediate llm dependency in chat flow.
        - is there a way we can avoid triggering guardrail egress calls on every user query? or is this unavoidable?
    - what is the p80, p90, p95, p99 of all requests?
    - user must be able to cancel query/request at any moment.
    - for an MVP, persistence of state is not really needed for this chatbot.
    - how can we budget token context for conversation turns without it impacting performance?

open-ended questions & discussion:
    - how can we rate-limit this user, such that they are not able to continuously hit submit and cancel?
        - we could "buffer" the request, meaning that the client waits 1-2 seconds before actually submitting the request.
        - or we could do it the proper way and just track the ip address and apply a global rate-limiting policy at the (1m, 5m, 15m, 60m, and 24h level).
            - an external service could analyze what IPs keep trying to attack this feature and we can just blacklist these IPs.
    - given that the text content is relatively small, we "could" just inject the entire resume into the prompt alongside the user query 
    at step 3 in lambda api service, but if we want to add in detailed write-ups, architectural tradeoffs, and decision making intent, 
    implementing RAG might be beneficial.
    - at some point, voice support would be a really nice addition, but it depends on bedrock or elevenlabs pricing/performance cost analysis.
        - should auto-submission from voice support trigger a cloudflare turnstile check? is it worth the additional cost?
    - how can we STREAM ALL METRICS VIA OTEL TO AN EXTERNAL COLLECTOR TO AGGREGATE METRICS?
        - LiteLLM has native OTel integration, which is beneficial, maybe we should use litellm to capture token usage, etc. since they have good otel integration.
    - for cancelled user request(s), how does this map out? because lambda is a serverless invocation that will more than likely horizontally scale and serve multiple requests.
    meaning that cancelling 1 user request, should not drop the instance, but rather the job itself. typically cancelled job(s) require a control plane or AWS EKS, but in our case,
    because our infrastructure is on aws using lambda + bedrock + ai gateway, is it possible to even drop jobs and what would that look like? what are the tradeoffs between eks and lambda?
    is a job broker even needed in our scenario, and is it even supported on lambda?
        - i need to perform a cost analysis tradeoff, since the main use case for me is to showcase this chatbot to users, allow them to ask questions about me, and have it explain to them
        what my skills are, how relevant my skills are to their job posting, and showcasing my engineering abilities.

data flow:        
    client: 
        - check user query character count.
            - if character count > 1,000 characters, disable submit button.
        - user clicks submit button and begins request pathway.
            - trigger hidden captcha check via cloudflare turnstile upon submit button (this only happens once per submission).
                - if hidden captcha check failed, then we want to block the request.
            - did user cancel query?
                - if yes, cancel request/job.
        ||
    lambda api service:
        1. check user query for malicious characters and enforce token budget.
            - if character length is > 1,000 characters, discard query.
            - if any character(s) detected are not natively supported or malicious, discard query.
            - return error if any of these checks succeeded (this error is realistically only for API requests that are spoofed, since CORS will be enabled along with a turnstile check.
            this might be overengineering, but this is more about Defense in depth and peace of mind).
        2. send user query to bedrock guardrails.
            - check response for user query intent.
                - if user query is attempting malicious intent, discard query.
                - if user query is out of scope with policy, discard query.
                    - this is a weird one, because if a user query attempts prompt injections, how can we weight our policy/prompt more heavily?
                - return error if any of these checks succeeded or should i stream back message?
        3. pass user query to a flash-lite model.
            - in the prompt, we want to enforce writing styles so that the flow is more conversational, see: https://github.com/conorbronsdon/avoid-ai-writing/blob/main/SKILL.md?plain=1
                - count the number of tokens this would use for output.
            - stream tokens back to client.
        ||
    client:
        - accept streamed tokens from lambda api service.
            - if user request is finished, update client component from cancel button to submit button.
                - submit button must have internal state where the chatbox element must be able to detect free-form user queries.
            - did user cancel query?
                - if not, keep streaming tokens until completed.
                - otherwise, cancel request.
```
