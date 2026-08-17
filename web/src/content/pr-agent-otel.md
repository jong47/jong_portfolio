# I got promoted to senior after one year, so I went looking for proof I deserved it

## Titles don't mean shit

I got promoted to senior software engineer about a year and a half in. I didn't think I deserved it.

This isn't modesty. Titles are mostly an HR instrument, a lever for headcount and retention, and only loosely coupled to whether you're any good. One of our other senior engineers, a former SDE 2 at Amazon and the person on the team I'd have most wanted to hear it from, told me the same thing outright: titles don't mean shit. He's leaving now, which means the one person in the building whose read on my work I'd have trusted is walking out the door.

My promotion came at a company nobody outside our immediate industry has heard of, at a moment when someone had to own the AI/ML platform work, which I volunteered for. It told me my manager wanted me to stay. It didn't tell me the work was good.

And I couldn't answer that alone. Not because I lack context on my own commits, but because I have too much of it. I know why every shortcut was taken and what the constraints were, so I grade on my own curve, and I can't see the standard I might be missing because I've never worked anywhere that held it.

So I went searching for a solution: **a verdict from someone with no reason to be kind to me.**

That is the real reason this PR exists.

## Observability was my weakest area

I'm a software engineer that specializes on AI/ML infrastructure, real-time systems, data pipelines, and cloud security.

And I had a hole in the middle of all of it.

Ask me to explain OpenTelemetry past "it's the thing that puts traces in Datadog" and I'd start hedging. Spans versus metrics. Tracer providers, meter providers, why exporters are pluggable, what a batch span processor buys you. I had operated systems built on every bit of that and never built one.

That's not a small gap for someone with "platform" in their title. In AI infrastructure, observability _is_ the cost story. Route requests to five models through a gateway and the question finance asks isn't "does it work," it's "where did eleven thousand dollars go last month." No instrumentation, no answer. I'd been shipping the thing that generates the bill without shipping the thing that explains it.

So I picked observability **because** it was my weakest area. Contributing somewhere I was already strong would have proved nothing except that I can repeat myself.

## Finding a problem someone had already asked for

I didn't want a README typo contribution. I went looking for an open issue a maintainer had already blessed.

[pr-agent](https://github.com/qodo-ai/pr-agent) is a widely used open source AI code review tool, roughly 12.6k stars. Issue #1964: _Support for sending utilization metrics via OpenTelemetry._ Someone wanted to know what their deployment cost, in tokens, by model, in DataDog.

Perfect shape. The tool calls LLMs through LiteLLM. Every call returns a usage object with token counts. The data already existed and was being thrown away. No ambiguity about whether the feature was wanted, only about whether I could build it well.

I opened the PR on February 3rd.

## Decision one: a module, not a sprinkling

The lazy version imports `opentelemetry` at the top of the LiteLLM handler and initializes a provider inline. It works, and it's how instrumentation rots, because setup logic tangles into business logic and nobody can touch one without reading the other.

I added `pr_agent/telemetry/`: `config.py` reads and validates settings, `types.py` holds the typed result, `tracer.py` and `meter.py` build providers, `shutdown.py` flushes on exit.

Config gets read in exactly one place. Otherwise you get `get_settings().get("OTEL.SOMETHING")` scattered across files, each with its own default, each one a place where a typo becomes a silent misconfiguration. One function reads settings, validates once, and returns a dataclass:

```python
@dataclass
class TelemetryConfig:
    is_enabled: bool
    exporter_type: Optional[str]
    service_name: Optional[str]
    service_version: Optional[str]
    environment: Optional[str]
    otlp_endpoint: Optional[str]
    otlp_headers: Optional[Dict[str, str]]
```

Downstream code never re-checks whether `exporter_type` is legal, because it couldn't have been constructed otherwise.

Initialization is lazy and cached, so any module can call `get_tracer()` without knowing whether setup has happened:

```python
@functools.lru_cache(maxsize=1)
def get_tracer():
    return _init_telemetry()
```

`lru_cache` memoizes and, in an async app where two coroutines could race to build a provider, gives you thread safety on that path for free.

One detail I'd defend anywhere: `service_version` isn't a config field. It comes from `get_version()`, same as the rest of pr-agent. Making a human type their version number into a config file guarantees the number in your traces is eventually wrong.

## Decision two: invisible unless you want it

This is the part I think separates instrumentation people merge from instrumentation they don't.

pr-agent has a lot of users and almost none of them asked for OpenTelemetry. If my PR makes their deployment noisier, slower, or likelier to crash, it's a bad PR regardless of how good the traces are for the three people who enable it.

So I wrote the failure behavior down before writing the code:

| Scenario                                                          | Behavior                                 |
| :---------------------------------------------------------------- | :--------------------------------------- |
| `otel.is_enabled = false`                                         | No tracing, no overhead                  |
| Enabled, missing `exporter_type` / `service_name` / `environment` | Warn, fall back to non-OTEL              |
| Invalid `exporter_type`                                           | Raise `ValueError` listing valid options |
| `exporter_type = "otlp"`, no endpoint                             | Warn, fall back to console               |

These aren't the same behavior four times. Two degrade quietly, one refuses outright. The rule: **fall back when the user told you what they want and you can't deliver it. Refuse when the user told you something that cannot be true.**

`exporter_type = "otlpp"` is a typo with no correct interpretation. Silently falling back to console gives them a working app, no traces in their backend, and no idea why. Missing `service_name` is different: it usually means the config was never filled in, and crashing everyone's deployment over telemetry nobody asked for is unacceptable.

The whole init is wrapped so a bug in my own code can't take the app down, falling back to a no-op tracer. That's the trick that makes the call sites clean: OpenTelemetry's API package ships a no-op implementation, so `get_tracer().start_as_current_span(...)` costs a function call when telemetry is off. No `if enabled:` guards anywhere.

I didn't know that existed three weeks earlier.

## Instrumenting the actual model calls

The real question with instrumentation is always: where's the seam?

Every model call in pr-agent funnels through `LiteLLMAIHandler`, which splits internally between streaming and non-streaming. That split is the problem, since streaming responses don't hand you a usage object the same way. I wrapped at the outer layer and passed the span down:

```python
with get_tracer().start_as_current_span("LiteLLMAIHandler._get_completion") as span:
    resp, finish_reason, response_obj = await self._get_completion(span, **kwargs)

if hasattr(response_obj, "usage") and response_obj.usage:
    get_tokens_histogram().record(
        getattr(response_obj.usage, "total_tokens", 0),
        {"litellm.request.model": model},
    )
```

Attribute-setting then splits by shape: request, non-streaming response, streaming response. The token extraction is aggressively defensive, and that's not paranoia. LiteLLM normalizes across a dozen providers and `usage` isn't shape-guaranteed. `completion_tokens_details.reasoning_tokens` exists on reasoning models and not others. An `AttributeError` thrown from telemetry code inside a request path would be an absurd way to break someone's review bot.

What came out in Datadog:

```json
"litellm": {
  "request":  { "model": "openai/gpt-5.2-2025-12-11" },
  "response": { "finish_reason": "stop", "streaming": "false" },
  "usage": {
    "completion_tokens": 181,
    "prompt_tokens": 1526,
    "reasoning_tokens": 47,
    "total_tokens": 1707
  }
}
```

Reasoning tokens broken out separately, which matters because they're billed differently and invisible in the completion count.

## Traces answered the wrong question

I shipped traces, sat with them, and realized I'd solved a debugging problem when the issue had asked a cost question.

Traces are per-request. Great for "why was this call slow." Wrong for "what's my p95 token usage on gpt-5 this month," because answering that from spans means retaining and aggregating every span, and backends sample spans away specifically to avoid that.

So I added a `MeterProvider` alongside the tracer: a counter for command volume tagged by command and git provider, and a histogram for tokens tagged by model. Histograms give you percentiles and sums without keeping individual events.

No new config keys, no new packages. `opentelemetry-sdk` already ships the metrics SDK and the OTLP package already ships `OTLPMetricExporter`. Adding a dependency to a project this size is a real cost and I wanted the metrics half free.

## Dependency hell, which no tutorial mentions

Mid-way through, the Docker build broke on something I hadn't written. `opentelemetry-proto==1.39.1` needs `protobuf>=5.0`. pr-agent pinned `google-cloud-aiplatform==1.38.0`, which needs `protobuf<5.0.0dev`. Empty intersection, and pip fails without pointing at the actual conflict.

No clever fix exists. Either pin OpenTelemetry back to a protobuf-4-era release and ship a year-old SDK, or move aiplatform forward:

```diff
-google-cloud-aiplatform==1.38.0
+google-cloud-aiplatform>=1.66.0
```

The review bot flagged this as a dependency risk, correctly: swapping an exact pin for a lower bound makes builds non-reproducible. Fair, and I don't have a fully satisfying answer. My take is that this is a maintainer's call, not a contributor's, which is why I isolated it in its own commit with its own explanation instead of burying it in a feature commit.

## The review, which was the entire point

Then it got audited. First by the repo's review bot, then by a human collaborator on the project, someone with two decades in the field and commit rights on a repo where those are invite-only. That's the verdict I came for.

**The one that stung: I was leaking data.** I'd been setting `pr_agent.pr_url` as a span attribute. Reasonable on its face. But PR URLs contain org names and private repo names, and those spans ship to a third-party backend. I'd written a data egress path into someone else's tool and felt clever about the trace context. Fix: gate it behind `OTEL.INCLUDE_PR_URL`, default false.

The lesson generalizes. Instrumentation is a data egress channel, and "it's just telemetry" is how that stops getting scrutinized.

**`exporter_type = "none"` was silently broken.** `_create_exporter` returned `None` for that case, dropping spans without an exporter. Sensible. But `"none"` was never added to `VALID_EXPORTER_TYPES`, so the config layer rejected it before it could ever reach that branch. A feature that existed in one function and was refused by another. Exactly the bug centralized validation is supposed to prevent, which only works if the central list is correct.

**Validation ordering was backwards.** My `exporter_type` check ran after the missing-fields check, so a typo plus an unset `service_name` produced the generic warning and a silent disable. The user never learned about the typo. Moved the type check to the top: loud failures shouldn't be preemptable by quiet ones.

**Still unfixed, and I'll say so.** `meter.py` registers its own `atexit` handler while tracer shutdown lives in `shutdown.py`. Two mechanisms doing one job, with init order deciding what actually happens. Real inconsistency, still in the branch. I know how to fix it. I haven't.

The maintainer's verdict came with two blockers: the branch has drifted and conflicts with main, and there are no tests covering exporter wiring or the shutdown path. Both correct. I shipped nineteen commits of infrastructure with no unit tests and asked someone to take my word that the exporter selection works. Rebase and tests are next.

I wanted to end this on a merge. I don't get to.

## The verdict I actually got

Going back through the thread, here's what I noticed.

Not one piece of feedback was _you don't understand how this works._ Every single one was a judgment call at a boundary. Fail loud or quiet. Opt in or default on. Is a loosened pin acceptable here. Where does shutdown live. Those are the arguments engineers have with each other, not the arguments you have with someone who's faking it. And the response to the design itself was that the gap was real and the module layout was sensible, from someone whose job is telling contributors when it isn't.

That's the acknowledgement I was after, and it's a narrow one, which is what makes it worth anything. I picked the domain I was weakest in, learned it well enough to build something real in a codebase I'd never seen, and when a stranger with far more experience than me went through it line by line, he argued with my decisions instead of my competence. I got things wrong. I got them wrong at the edges, under review, fixable.

That's the only kind of proof available, and you can't manufacture it alone. Titles don't mean shit. Neither does your own opinion of your work. Go put it in a room where nobody has a reason to be nice to you.
