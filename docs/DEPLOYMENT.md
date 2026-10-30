# Cloud Run deployment

These are operator instructions, not actions performed by the development agent.
The repository includes a Dockerfile and `deploy/cloudrun.yaml`; no service is
deployed or IAM policy changed by local builds/tests.

## Prepare Google and Claude

1. Create/select a Google project with billing. Enable Cloud Run, Cloud Build,
   Artifact Registry, and Secret Manager. Build/storage/network charges have
   separate allowances; billing alerts do not enforce a hard cap.
2. Create a dedicated runtime account such as
   `fomo-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com`. Do not create a JSON key
   or grant it Owner/Editor. Build/deployer identities have separate permissions.
3. Create an Anthropic API key in the intended Claude Console workspace and set
   workspace usage/spending limits.
4. Create Secret Manager secrets `fomo-access-password` (a random password of at
   least 16 characters) and `fomo-anthropic-api-key` (the Anthropic API key). Grant
   the runtime account Secret Accessor on these two secrets only. Do not place
   secret values in the manifest, command history, browser build, or Git. Use the
   console's secret input or a protected input file.

## Build an image

The two-stage Dockerfile builds the frontend with Node 24, installs only production
runtime dependencies, copies server and shared engine source, and runs as the
unprivileged `node` user. Real environment files and local dependencies are ignored
by both Docker and Google source uploads. The image listens on `PORT` (8080).

For a local image build:

```sh
docker build -t fomo-simulator .
```

For a Google build, first create an Artifact Registry Docker repository named
`fomo` in your chosen region. Then, after replacing project/tag placeholders:

```sh
gcloud builds submit --project YOUR_PROJECT_ID \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/fomo/fomo-simulator:YOUR_TAG .
```

The frontend defaults to API mode in Docker (`VITE_AI_ENABLED=true`) with five
turns. Override Docker build arguments to change either. Server `AI_ENABLED`
and `CLAUDE_MODEL` remain runtime settings, never browser build arguments.

## Deploy privately first

Copy/edit `deploy/cloudrun.yaml` and replace every `YOUR_*` placeholder, including
the image tag, runtime service-account email, and HTTPS service origin. Verify the
secret names and version references. Use the exact Cloud Run service URL (no
trailing slash). For a new service
whose generated URL is not known, make a private first deployment with a temporary
HTTPS origin, retrieve its URL, then update `APP_ORIGIN` before browser testing.
Same-origin API POSTs are intentionally blocked until that value matches.

```sh
gcloud run services replace deploy/cloudrun.yaml \
  --project YOUR_PROJECT_ID --region us-central1
```

The manifest enables IAM invocation checks and does not grant `allUsers` access.
Inspect IAM bindings if replacing an existing service; a YAML update is not a
guarantee that old public role bindings have disappeared. Configure request-based
billing, minimum instances 0, and maximum instances 1 as shown in the manifest.

Production additionally requires HTTP Basic application login. For private API
testing, send the Google invocation token in `X-Serverless-Authorization` and
application Basic credentials in `Authorization`; this avoids both layers
competing for the same header. Do not log either header. See
[Cloud Run authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).

For ordinary browser use, choose an intentional access arrangement: keep an
authenticated gateway/IAP in front of the private service, or explicitly allow
public Cloud Run invocation while retaining the application's HTTPS password
protection and limits. The repository does not automatically grant public access.
Shared login has no per-user revocation or quota; use proper user authentication
and durable quotas before broad public use.

## Verify the actual deployment

1. Check the startup probe and `/healthz`. A healthy response does not prove
   the API key works; Claude is called only when content is requested.
2. Confirm HTML/API requests without application login are rejected, and cross-site
   or malformed API requests fail without making Claude calls.
3. Play a complete AI run in the intended workspace. Check Claude Console usage
   to confirm requests are attributed to the intended key/workspace.
4. To rotate the API key, add a new Secret Manager version, update the manifest
   version reference, and deploy a new revision. Verify it before revoking the old key.
5. Verify the browser bundle/network carries no provider credentials, model
   settings, or direct Claude requests. Requests should target `/api/game/*`.
6. Verify rate/quota rejection and static fallback. Limits reset per process and
   during revision rollouts; provider spending controls remain necessary.

The standalone integration class uses the same API key client. Run
`npm run test:integration:claude` with `ANTHROPIC_API_KEY` in the environment or
local `.env.server`. It makes a real billable call and is not executed by CI.
