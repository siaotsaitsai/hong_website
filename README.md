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

## Content editing

Use your own invited Sanity account to sign in to the Studio. No shared passwords.

1. **Artworks**: upload a main image and optional detail images. Add a title,
   image description, year, medium, dimensions, and description. Generate the URL
   slug; check non-Latin titles or enter a short English slug manually. Publish.
2. **Collections**: add references to published artworks and drag to sort. Publish.
3. **Artist profile**: edit the artist name, portrait, introduction, statement,
   exhibitions, education, and residencies. Publish.
4. **Home & contact**: select the featured artwork, choose and order visible
   collections, and add a public email and Instagram URL. Publish.

Only references to published works appear publicly. The public site respects
collection and artwork ordering. If no collection order is configured, collections
are sorted by title; works without any collections can appear in Collected Works.
An explicitly empty collection order hides the collection list. Artist profile
and Home & contact are singleton documents; the Studio hides duplicate/delete/
unpublish actions for these to prevent accidental edits. This is UI protection,
not an authorization boundary.

The Studio schemas and labels are English. Existing stored content is not translated
automatically. The frontend preserves English defaults until real content is provided.
Invite the artist through Sanity Manage → Members, using the least privileged
available role that allows content editing and publishing. Token-based deployment
does not validate an invited member's acceptance or permissions.

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
