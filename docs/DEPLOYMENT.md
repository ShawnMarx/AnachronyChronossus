# Deployment

Anachrony is a **static Vite/React SPA with no backend**. `npm run build` produces
`dist/`, and a web server serves those files directly — there is no service to run, no
database, and nothing to restart.

## How it ships

| Branch | Goes to | Workflow |
|---|---|---|
| `staging` | the staging site | `.github/workflows/deploy-staging.yml` |
| `main` | production | `.github/workflows/deploy-production.yml` |

Both workflows SSH to the host, `git reset --hard` to the pushed commit, `npm ci`, and
`npm run build`. They need two repo secrets (Settings → Secrets and variables → Actions):

| Secret | What it is |
|---|---|
| `PROD_HOST` | the deploy host |
| `DEPLOY_SSH_KEY` | the deploy private key, whose public half is on that host |

Nothing else about the server is needed to work on this app, and nothing here has to be
true for `npm run dev` — the app runs locally with no infrastructure at all.

## Operational detail

The host, the nginx vhosts, the TLS certificates and the deploy-key rotation procedure
live in the **private BoardGameEdge infrastructure repo**, under its Anachrony page —
not here. That is deliberate: those facts describe a shared machine that hosts several
apps, so a single repo is the wrong place to publish them.

If you are running your own copy, any static host will do: build with `npm run build`
and serve `dist/` with SPA-style fallback to `index.html`.

## Related services (all optional)

The app works fully offline with no accounts. When reachable, it talks to three shared
BoardGameEdge services from the browser — sign-in, saved game history, and an in-app
rules reference. All three are optional: if they are unavailable, the app plays normally
and simply doesn't save anything server-side.
