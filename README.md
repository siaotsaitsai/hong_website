# Hong — Artist Portfolio

An English-language artist portfolio built with Astro and Sanity Studio.
The website uses a warm paper palette, a persistent desktop navigation, responsive
mobile navigation, collection galleries, and an accessible artwork dialog.

## Website and Studio

- Visitor website source: `web/`; production output: `web/dist/`.
- Studio: <https://hong-portfolio-htq7wor5.sanity.studio/>.
- Sanity project: `htq7wor5`; dataset: `production`.
- The visitor website is configured for GitHub Pages through `.github/workflows/deploy-website.yml`. Deployment status must be verified in GitHub Actions before claiming it is live.

The frontend reads **published content only** from the public Sanity query API
on each page load. Publishing content does not require rebuilding the website;
visitors see the updated content on their next page load or refresh. An already
open page does not update live. Browser requests never send a token or credentials.
The public dataset must contain only information intended for visitors.

When the dataset contains no published documents, the site displays four original
SVG sample compositions and sample English copy. They are local placeholders,
not the artist's works and not images copied from the reference site. They are
not written into Sanity. Once any content is published, the site uses the published
content and appropriate empty states. A failed query displays a visible notice
and retry button instead of silently pretending the sample collection is current.

## Development

Requires Node.js >=22.12, npm, and Python 3 for the static browser-test server.

```bash
cd /workspace/hong_website
npm ci
npm run dev
```

The frontend runs on port 4321. Astro's automatic agent backgrounding is disabled
with its supported `--ignore-lock` flag so process management works in cloud tasks.
For a cloud machine with a read-only default config/cache directory:

```bash
npm --cache /tmp/hong-npm-cache ci
XDG_CONFIG_HOME=/tmp/hong-astro-config npm run dev
```

Other commands:

```bash
npm run typecheck
npm run build
npm test
npm run preview
npm run studio:dev
npm run studio:build
npm run schema:extract
```

`npm run dev`, `build`, and `preview` now refer to the visitor website.
Studio commands use the explicit `studio:` prefix; `deploy` remains a Studio
command for compatibility. Use a writable `XDG_CONFIG_HOME` for Sanity commands
in this cloud environment too, such as `/tmp/hong-sanity-config`.

## Content editing and draft preview

See [EDITOR-GUIDE.md](EDITOR-GUIDE.md) for the step-by-step guide.
The Studio has five top-level entries: Home, Portfolio, CV, Artist Statement, About.
Portfolio contains collection ordering, collections and artworks. Home supports a
standalone uploaded image or an artwork reference, caption, body text and link label.

CV (`cvPage`) and Artist Statement (`statementPage`) are independent singleton
documents. About preserves the existing `artistProfile` ID. Collection ordering
uses `portfolioSettings`. Legacy profile CV/statement and siteSettings collections
are preserved as fallbacks until the corresponding new documents are published.
Initial-value resolvers copy legacy values into the new editor forms; empty newly
published pages intentionally override old content. No migration writes or deletes
are performed by deployment.

Every document provides Edit and Website preview views. The authenticated Studio
loads draft documents with the member's own session, overlays the current form,
and resolves references in memory. It sends the rendered content model to the
website iframe with an exact target origin. The website only accepts messages from
its parent, from allowlisted Studio origins, with the matching per-view channel.
A standalone URL cannot activate draft access. The public API query remains
`perspective=published`, and no token is transmitted to the iframe.

Both Studio and frontend must be deployed for this preview to work. Individual
artwork/collection previews focus on the current item; the Portfolio order preview
represents the selected portfolio. Invited-member authentication, image upload and
publish operations need a real member-session acceptance test, separate from the
automated schema, normalization and browser bridge tests.

## Configuration

For Studio, copy `.env.example` to the ignored `.env` and set the public project ID
and dataset. The selected project's defaults are already configured locally.

For a different frontend project, set these **at build time**, or in ignored
`web/.env` (see `web/.env.example`):

```text
PUBLIC_SANITY_PROJECT_ID=htq7wor5
PUBLIC_SANITY_DATASET=production
```

These identifiers are public. Never use a `PUBLIC_*` or `SANITY_STUDIO_*` variable
for a token: those variables may be bundled into browser code.

In Sanity Manage → API → CORS origins, allow the exact frontend origin without
credentials. `http://localhost:4321` has been registered. When deploying the site,
add its actual HTTPS origin. Studio origins require credentials; its deployed
origin is already configured. Do not use a wildcard for credentialed origins.

## Deploying the frontend

The site is static and can be deployed to Netlify, Vercel, Cloudflare Pages, or a
custom-domain GitHub Pages site:

- Install command: `npm ci`
- Build command: `npm run build`
- Publish/output directory: `web/dist`
- Add the final site origin to Sanity CORS (without credentials).

For GitHub Pages, the workflow sets `BASE_PATH=/hong_website`. Navigation, bundled assets,
and sample image URLs respect this base path. To build for a root domain, omit BASE_PATH.
Sanity CORS has been configured for `https://siaotsaitsai.github.io` (without credentials).
The GitHub repository Pages source must be set to GitHub Actions. The workflow builds
and uploads `web/dist`, then deploys using GitHub’s short-lived Pages OIDC credentials;
it needs no Sanity deployment token. A push to `main` updates the frontend code; content
published in Sanity appears on page refresh without a new GitHub build.

## Deploying Studio changes

The deployment app ID is stored in `sanity.cli.ts`. The cloud environment injects
a **Deploy Studio** token securely as `SANITY_AUTH_TOKEN`, scoped to Sanity API
hosts. Do not copy the value into this repository or chat.

```bash
npm run studio:deploy -- --url hong-portfolio-htq7wor5 --yes
```

The deployment token does not grant content editing rights. To validate actual
uploads, draft saving, publication, and the artist's editing permissions, use
an invited project member's authenticated Studio session.

## Validation

The Playwright suite runs against the built static site, using explicit mocked
Sanity responses for empty content, published content and API failures. It tests
keyboard navigation and focus restoration, mobile navigation, collection order,
detail images, safe text rendering, no credential-bearing public requests,
published query perspective, and retry recovery. It is not evidence that content
uploads or invited-member permissions work.

```bash
npm run build
npm test
```

Tests use `/usr/bin/chromium` by default. On another machine, install Chromium
and set `CHROMIUM_PATH` to its executable, preserving TLS verification. For the
real Sanity check in this cloud environment, Chromium must use inherited proxy
settings and trust the platform-supplied CA. Do not disable certificate checks.

The live browser was separately checked against the public Sanity API. Actual
member upload and publication testing remain separate from frontend verification.

## Custom Home editor

`studio/easy/` implements the first custom page-editing screen, served at
<https://hong-portfolio-htq7wor5.sanity.studio/edit>. It replaces the Studio layout
for that tool route while retaining the existing authenticated project-member
context. The standard editor is preserved at `/structure`. This reuses the current
hosting and authentication; it is not a separate CMS or a new hosting service.

The UI is in `HomeEditorScreen.tsx`; the authenticated wrapper is in `HomeEditor.tsx`.
`homeGateway.ts` handles uploads and draft/publish mutations. Draft saving leaves
published content untouched. Publishing checks both document revisions and replaces
the published document and deletes the draft atomically. Unrelated settings fields
are retained. The custom screen intentionally supports Home only in this release.

The interaction tests use a Vite-served test harness on port 3333 and a mock gateway.
The persistence test uses the actual Sanity client against an in-process HTTP test
server to exercise request bodies and revision-conflict behavior without touching
cloud content. These tests do not establish that the artist's real account has
accepted its invitation or has upload/publish permission; that requires member
acceptance testing after login.
