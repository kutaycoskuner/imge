# Keyboard site

The [keyboard layout page](keyboard-layout.md) on its own, without the owner's name, so keymaps can be shared with people who shouldn't see who made them. It runs as a Docker container on a self-hosted server (the homelab: Raspberry Pi, Portainer, Cloudflare Tunnel).

## What it is and why

- **two sites from one code base**
    - the full imge on GitHub Pages, built by hand as before; nothing changes there
    - the keyboard site, built with `SITE=keyboard` into a Docker image, served by nginx on the server
- **what `SITE=keyboard` changes** ([src/lib/site.ts](../src/lib/site.ts))
    - no page navigation (graph editor, matrix, csv links)
    - no links to the GitHub repository or the other projects in the bottom-left bar; the version stays
    - no analytics tag of its own; the server adds one (below)
- **nothing about where it runs is public**: this repo and the public image contain no address and no analytics settings of the keyboard site
    - the address: only in the server's private configuration (tunnel route, stack)
    - the analytics tag: the stack's environment variable `ANALYTICS_TAG`, which nginx inserts before `</head>` of the page when the container starts ([nginx.conf.template](../nginx.conf.template)); empty = no analytics
    - keep it that way: don't write the address into this repo, its commit messages, issues or the workflow (its logs are public)
- **only the keyboard page is served**: SvelteKit still prerenders every page, so nginx serves a whitelist (the keyboard page, `/_app/`, `styles/`, `icons/`, `favicons/`, `favicon.png`, `data/keymaps/`) and answers 404 to everything else; `/` redirects to `/keyboard_layout`
    - a new file the keyboard page loads from `static/` needs its folder added to that whitelist
- **what is still yours**: the image name (`ghcr.io/kutaycoskuner/imge-keyboard`) and this repo; visitors of the site don't see them, and nothing on the site points to them

```text
push to main → .github/workflows/docker.yml: build (SITE=keyboard) → ghcr.io/kutaycoskuner/imge-keyboard:latest
  → POST PORTAINER_WEBHOOK → Portainer pulls latest, redeploys the stack (its ANALYTICS_TAG from the private configuration)
  → visitor → tunnel → the stack's port → nginx: the keyboard page, with the analytics tag
```

## Files

| File | What it does |
|---|---|
| [src/lib/site.ts](../src/lib/site.ts) | which site this build is (`SITE`); the full imge's analytics |
| [vite.config.ts](../vite.config.ts) | turns the `SITE` environment variable into `__SITE__` |
| [Dockerfile](../Dockerfile) | `pnpm build` with `SITE=keyboard`, then nginx with the build; `ANALYTICS_TAG` empty by default |
| [nginx.conf.template](../nginx.conf.template) | the whitelist, `/` → `/keyboard_layout`, the analytics tag from `ANALYTICS_TAG`, long cache for `/_app/immutable/` |
| [.dockerignore](../.dockerignore) | keeps `node_modules`, builds, `.env`, local folders out of the image |
| [.github/workflows/docker.yml](../.github/workflows/docker.yml) | on push to `main`: builds the image for arm64 and amd64, pushes it, calls the webhook |

## Try it locally

In PowerShell, in the imge folder.

1. the keyboard build without Docker: builds into `build/` with the keyboard settings, then serves it
    ```powershell
    $env:SITE = 'keyboard'; pnpm build; Remove-Item Env:SITE
    pnpm preview
    ```
    → http://localhost:4173/keyboard_layout shows no navigation and no GitHub / projects links; `pnpm preview` doesn't use nginx, so the other pages still open here
2. the image as on the server (Docker Desktop running): builds it, then serves it on port 8080 with a test tag
    ```powershell
    docker build -t imge-keyboard .
    docker run --rm -p 8080:80 -e 'ANALYTICS_TAG=<!-- analytics test -->' imge-keyboard
    ```
    → http://localhost:8080 jumps to `/keyboard_layout`, whose page source shows `<!-- analytics test -->` just before `</head>`; http://localhost:8080/graph_editor is a 404; Ctrl+C stops it

## Set up on the server

Once, in the server's **private** configuration (for the homelab: homelab-private), the same way as other app stacks with a webhook ([homelab: Portainer webhook](https://github.com/kutaycoskuner/homelab/blob/main/docs/integrations/portainer-webhook.md)). `<keyboard-domain>` below stands for the address you choose; write it only there. Each `apply` shows its plan first; check it, then type `yes`.

1. **first image**: push to `main` (or Actions → Docker image → Run workflow); the "Redeploy on Portainer" step is skipped while the secret doesn't exist
    - the new package `imge-keyboard` on ghcr.io is private by default: GitHub → your profile → Packages → `imge-keyboard` → Package settings → Change visibility → Public (it holds no address), or give the stack a registry login (`registries` in tofu/portainer)
2. **the stack**: a compose file in the private repo, e.g.
    ```yaml
    services:
      imge-keyboard:
        image: ghcr.io/kutaycoskuner/imge-keyboard:latest
        container_name: imge-keyboard
        restart: unless-stopped
        ports:
          - "8092:80"   # any free port on the server; the tunnel route below uses it
        environment:
          # the analytics script tag, double quotes only; leave out for no analytics
          ANALYTICS_TAG: '<script defer src="https://<analytics-host>/script.js" data-website-id="<id>" data-domains="<keyboard-domain>"></script>'
    ```
    and in `tofu/portainer`'s `stacks`: `"imge-keyboard" = { path = "<that compose file>", webhook = true }`
    ```powershell
    tofu '-chdir=../homelab-private/tofu/portainer' apply
    tofu '-chdir=../homelab-private/tofu/portainer' apply -refresh-only
    ```
    → the second reads the webhook URL Portainer created
3. **the public address**: in `tofu/cloudflare`'s `routes`
    ```hcl
    { subdomain = "<keyboard-subdomain>", port = 8092 },
    ```
    ```powershell
    tofu '-chdir=../homelab-private/tofu/cloudflare' apply
    curl.exe -s -o NUL -w "%{http_code}" https://<keyboard-domain>/keyboard_layout
    ```
    → `200`
4. **the CI secret**: add `kutaycoskuner/imge` to the fine-grained token's repositories (GitHub → Settings → Developer settings → Fine-grained tokens → the tofu token → Repository access), then the secret `PORTAINER_WEBHOOK` for this repo in `tofu/github`
    ```powershell
    tofu '-chdir=../homelab-private/tofu/github' apply
    ```
5. **test**: push a change to `main`; the workflow's last step is green, and on the server
    ```bash
    docker inspect imge-keyboard --format '{{.Created}}'
    curl -s http://localhost:8092/keyboard_layout | grep -c "data-website-id"
    ```
    → a time just after the workflow run (UTC); `1` (the analytics tag is in the page)
6. **analytics**: in Umami, add the keyboard domain to a website (a new one keeps its numbers apart) and put that website's ID in `ANALYTICS_TAG`

## Changes

- 2026-11-07 — no address or analytics of the keyboard site in this repo: the server sets `ANALYTICS_TAG` (nginx template)
- 2026-11-07 — first version: `SITE=keyboard` build (no navigation, no personal links), Docker image with nginx whitelist, CI to ghcr.io with the Portainer webhook, server setup steps
