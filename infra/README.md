# Infrastructure

Three CloudFormation stacks and one GitHub Actions pipeline. Nothing here contains a
real address, account id or domain — every value below is a placeholder, because this
repository is public.

| Stack | Region | Owns | Deployed by |
| --- | --- | --- | --- |
| `portfolio-bootstrap` | us-east-1 | GitHub OIDC trust, the deploy role, the permissions boundary, the spend budget | you, once, by hand |
| `portfolio-web` | us-east-1 | Private S3 bucket, CloudFront, ACM certificate, security headers | you once (certificate validation blocks), the pipeline after |
| `portfolio-api` | us-west-1 | Lambda under the Web Adapter, REST API Gateway, log group | the pipeline |

`portfolio-bootstrap` is deliberately outside the pipeline. It grants the pipeline its
power, so the pipeline must not be able to rewrite it.

The two us-east-1 stacks are there because CloudFront only accepts ACM certificates
issued in us-east-1. The api sits in us-west-1 because that is where SES is verified;
it calls Bedrock in us-west-2, which is a separate setting.

## Pipeline

One workflow, [`.github/workflows/pipeline.yml`](../.github/workflows/pipeline.yml).

- `api-checks` and `web-checks` run on every pull request and every push to `main` or
  `staging`. They reuse the same commands you run locally — `make test`, `make validate`,
  `npm run check`, `npm run test:e2e` — so there is one definition of "passing".
- `deploy` runs only on a push to `main`, only after both check jobs pass, and is the
  only job that can reach AWS or read a secret.

Deploy order is web stack, then api stack, then build the site against the api's real
URL, then upload, then invalidate. The site is built *after* the api deploy on purpose:
`VITE_CONTACT_API_URL` and `VITE_CHAT_API_URL` are read from the api stack's
`ApiBaseUrl` output rather than committed anywhere.

Assets upload before `index.html`, so the page never goes live pointing at files that
have not landed yet. Hashed files under `assets/` get a one-year immutable cache and are
not deleted — an old bundle costs fractions of a cent and keeps a visitor mid-session
from losing a lazy chunk. Everything else is `no-cache` and pruned with `--delete`.

## One-time setup

### 1. Bootstrap the account

Needs admin credentials. `CAPABILITY_NAMED_IAM` is required because the role and policy
have fixed names.

```sh
aws cloudformation deploy \
    --region us-east-1 \
    --stack-name portfolio-bootstrap \
    --template-file infra/bootstrap/template.yaml \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides \
        AlertEmail=you@example.com \
        GitHubRepository=owner/repo
```

If the account already federates GitHub Actions for another repository, add
`CreateOidcProvider=false` — an account holds one provider per issuer, and a second one
fails the stack.

### 2. Configure GitHub

Create an environment named **`prod`** and, in its settings, restrict deployment
branches to `main`. This is not decorative: GitHub puts the environment name in the OIDC
token's `sub` claim, and the deploy role's trust policy requires it. The branch
restriction is what makes "environment `prod`" mean "the `main` branch".

Environment secrets on `prod` — masked in logs, unreadable from any other job:

| Secret | Example |
| --- | --- |
| `AWS_ACCOUNT_ID` | `000000000000` |
| `CONTACT_EMAIL` | `you@example.com` |
| `SES_SENDER` | `site@example.dev` |
| `TURNSTILE_SECRET` | optional; omit to disable the captcha |

`TURNSTILE_SECRET` is the one parameter the pipeline omits rather than passes empty —
SAM's `--parameter-overrides` rejects an empty value, and its `ParameterKey=` form
silently mis-parses one into a junk parameter. Omitting it means CloudFormation keeps the
previous value on an update, so removing the secret from GitHub does not by itself turn
the captcha back off. To actually disable it after it has been on, set the stack's
`TurnstileSecret` parameter to empty once (console, or `aws cloudformation update-stack`
with the other parameters as `UsePreviousValue`).

Repository variables — these are public by nature, so they are variables, not secrets:

| Variable | Example |
| --- | --- |
| `SITE_DOMAIN` | `example.dev` |
| `VITE_TURNSTILE_SITE_KEY` | optional; ships in the JS bundle by design |

Then enable branch protection on `main` requiring `api-checks` and `web-checks`.

### 3. Verify SES

Verify `SES_SENDER`. While the account is in the SES sandbox, verify `CONTACT_EMAIL`
too — the sandbox will not deliver to an unverified recipient.

### 4. Create the web stack and validate the certificate

Run this yourself the first time. It blocks while ACM waits for a DNS record, which
would sit burning a pipeline job.

```sh
aws cloudformation deploy \
    --region us-east-1 \
    --stack-name portfolio-web \
    --template-file infra/web/template.yaml \
    --parameter-overrides DomainName=example.dev
```

While it waits, in another shell, find the record it wants:

```sh
arn=$(aws cloudformation describe-stack-resources --region us-east-1 \
    --stack-name portfolio-web --logical-resource-id Certificate \
    --query 'StackResources[0].PhysicalResourceId' --output text)

aws acm describe-certificate --region us-east-1 --certificate-arn "$arn" \
    --query 'Certificate.DomainValidationOptions[].ResourceRecord'
```

Add those CNAMEs at your registrar. Validation usually completes within minutes and the
stack finishes on its own.

### 5. Point the domain at CloudFront

```sh
aws cloudformation describe-stacks --region us-east-1 --stack-name portfolio-web \
    --query "Stacks[0].Outputs" --output table
```

`www` takes a plain CNAME to `DistributionDomainName`. The apex cannot take a CNAME
under the DNS spec, so it depends on your registrar: use CNAME flattening / ALIAS /
ANAME if offered, otherwise point the apex at a redirect to `www`.

### 6. Bedrock model access

Independent of everything above. Deploys succeed without it; the chat endpoint streams
its polite failure line until the account is granted access to the Haiku inference
profile.

### 7. Merge to `main`

Nothing deploys from uncommitted work, or from `staging`.

## Security

Threat model is STRIDE, taken over the boundary between a public repository, the Actions
runtime, and the AWS account.

**Spoofing.** No AWS keys exist to steal. The deploy role is assumable only over OIDC,
only with `aud` of `sts.amazonaws.com`, and only with a `sub` of
`repo:owner/repo:environment:prod`. A fork, another branch, or another repository
produces a different `sub` and is refused by STS.

**Tampering.** The workflow triggers on `pull_request`, never `pull_request_target`, so
a fork's code runs without secrets and with a read-only token. Every third-party action
is pinned to a full commit SHA with the version in a trailing comment; a retagged
release cannot change what runs. Dependencies install from lockfiles only (`npm ci`,
`uv sync --frozen`).

**Repudiation.** CloudTrail records each role assumption and stack change at no cost.
The session name is `pipeline-<run id>`, so an AWS event maps back to a workflow run and
from there to a commit on `main`.

**Information disclosure.** Actions logs on a public repository are world-readable, so
everything sensitive is a `prod` environment secret: masked in logs and unavailable to
the check jobs. `ContactEmail`, `SesSender` and `TurnstileSecret` are all `NoEcho` in
the api template, so `sam deploy`'s parameter table and `describe-stacks` show `****`
rather than the value. The site bucket is private with public access blocked at the
bucket level and is readable only by this one distribution, enforced by an
`AWS:SourceArn` condition. `.env.staging` and `.env.prod` are gitignored; only
`.env.example` is tracked. The application never logs what a visitor typed and never
returns an internal error to the browser.

**Denial of service and runaway spend.** Gateway throttling is 5 rps on `/chat` and
1 rps on `/contact`; reserved concurrency caps the function at 10; output tokens are
bounded per answer. Log retention is 30 days rather than forever. The budget emails at
80% of actual and at a forecast of 100%. Workflow concurrency cancels superseded check
runs but never cancels an in-flight deploy.

**Elevation of privilege.** The deploy role holds `PowerUserAccess`, which excludes IAM,
plus a narrow IAM grant over `role/portfolio-*` only. Creating a role there is allowed
only when it carries the `portfolio-boundary` permissions boundary — an
`iam:PermissionsBoundary` condition enforces it — and the role cannot remove a boundary,
because `iam:DeleteRolePermissionsBoundary` is not granted. So the effective ceiling on
anything the pipeline creates is SES send, Bedrock invoke, and writing its own logs,
whatever a future edit to the api template asks for. An explicit `Deny` covers
`role/portfolio-deploy` and the boundary policy itself, which otherwise match
`portfolio-*` and would let the pipeline widen its own permissions.

### Residual risks, accepted

- **No WAF.** A rate-based per-IP rule on the REST stage is the right control for
  sustained abuse, and it costs roughly $6.60/month against a design that otherwise
  sits near zero. The throttles and concurrency cap are the interim answer.
- **No Content-Security-Policy.** The distribution sets HSTS, `X-Content-Type-Options`,
  `X-Frame-Options: DENY` and a referrer policy — all of which are safe to add blind.
  A CSP is not, because a wrong one breaks the site silently and can only be verified
  against the live domain. When you add it, it needs at least: `default-src 'self'`,
  `connect-src` for the API Gateway host, `script-src` and `frame-src` for
  `https://challenges.cloudflare.com` if Turnstile is on, `style-src 'self'
  'unsafe-inline'` for Tailwind and Shiki's inline styles, `img-src 'self' data:`,
  `object-src 'none'` and `frame-ancestors 'none'`. Ship it in report-only first.
- **`TURNSTILE_SECRET` is a Lambda environment variable.** Reading it requires access to
  the AWS account, which is the same access that would read it from SSM. Moving it to a
  SecureString adds a call on every cold start and changes nothing at this boundary.
- **Optional extra OIDC hardening.** GitHub's token also carries a `ref` claim, so
  `token.actions.githubusercontent.com:ref` can be pinned to `refs/heads/main` in the
  trust policy on top of the environment check. It is left off because a claim mismatch
  fails closed with an opaque `AccessDenied`; add it once the first deploy is known good.
- **The site build runs third-party code with AWS credentials in the environment.**
  `npm ci` is deliberately moved ahead of the credential step, so package install
  scripts never see them. `npm run build` cannot be: it needs the api's URL, which needs
  a credentialed `describe-stacks`. The residue is Vite and its plugins running for the
  seconds between assuming the role and finishing the upload, with a role that can reach
  only this project's own resources and expires in an hour.
- **Apex and www both serve, with neither canonical.** Fine for a portfolio, mildly bad
  for search engines. Fix it with a `<link rel="canonical">` in `web/index.html` or a
  CloudFront Function redirect when it matters.
- **A missing file returns the app, not a 404.** The 403/404 rewrites are
  distribution-wide, so a genuinely absent asset arrives as `index.html` with a 200.
  Scoping that per-behaviour needs a CloudFront Function. In practice a deploy uploads
  hashed assets before `index.html`, so the page never references a file that is not
  there yet.

## Things that will surprise you

- **`ReservedConcurrentExecutions: 10` needs regional headroom.** Reserving concurrency
  requires leaving at least 100 unreserved, so on an account whose Lambda concurrency
  quota has not been raised past 110 the first stack create fails. Raise the quota, or
  drop the property and rely on the gateway throttles alone.
- **SAM's managed artifact bucket is the one unbounded store here.** `resolve_s3 = true`
  creates it with versioning on and no lifecycle rule, so every deploy's ~14 MB artifact
  is kept forever. Pennies a year, but it only ever grows. To cap it, once:

  ```sh
  bucket=$(aws cloudformation describe-stacks --region us-west-1 \
      --stack-name aws-sam-cli-managed-default \
      --query "Stacks[0].Outputs[?OutputKey=='SourceBucket'].OutputValue" --output text)

  aws s3api put-bucket-lifecycle-configuration --bucket "$bucket" \
      --lifecycle-configuration '{"Rules":[{"ID":"expire-old-artifacts","Status":"Enabled",
        "Filter":{},"NoncurrentVersionExpiration":{"NoncurrentDays":30},
        "AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}}]}'
  ```

- **The site bucket is `DeletionPolicy: Retain`.** CloudFormation cannot delete a bucket
  with objects in it, so without this every `portfolio-web` stack delete would fail
  half-way. The trade is that deleting the stack leaves the bucket behind to remove by
  hand.
- **The api build strips `boto3`/`botocore`** and uses the runtime's copy, which keeps
  the artifact at 14 MB but means production runs a slightly different SDK from the
  tests, and AWS can change it under you. The two calls involved — `converse_stream` and
  `send_email` — are long-stable, which is what makes that trade acceptable.

## Local commands

```sh
cd api && make test          # pytest, ruff check, ruff format --check
cd api && make validate      # sam validate --lint against ../infra/api/template.yaml
cd infra/api && sam build    # packaging, arm64 wheels, run.sh mode

uvx cfn-lint infra/web/template.yaml infra/bootstrap/template.yaml
uvx zizmor .github/workflows/pipeline.yml

cd web && npm run check && npm run test:e2e
```

`sam build` writes `infra/api/.aws-sam/`, which is gitignored.
