# -------------------------------------------------------------------------------------------
#   author          : Kutay Coskuner
#   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
#   last update     : 2026-11-07
#   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
#                     Check outputs before relying on them.
# -------------------------------------------------------------------------------------------
# Dockerfile -- the keyboard-only site as a small nginx image, for a self-hosted server (the
# homelab's Raspberry Pi). The GitHub Pages site (full imge) is not built here.
# The image holds no address and no analytics: the server's private configuration sets
# ANALYTICS_TAG when it starts the container (nginx.conf.template).
#
# Stage 1 builds the site with pnpm and SITE=keyboard ($lib/site.ts: only the keyboard page,
# no navigation, no personal links). It runs on the build machine's own platform
# ($BUILDPLATFORM): its output is plain HTML/CSS/JS for any CPU, so the GitHub runner never
# emulates ARM for Node.
# Stage 2 is nginx with only that build/ folder and nginx.conf.template; no Node in the final image.
#
# Built and pushed by .github/workflows/docker.yml on every push to main; run on the Pi as a
# Portainer stack from the homelab's private configuration. Local test:
#   docker build -t imge-keyboard .  &&  docker run --rm -p 8080:80 imge-keyboard
#   (http://localhost:8080 opens the keyboard layout). Details: docs/keyboard-site.md

FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
# pnpm in the version package.json names (packageManager)
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV SITE=keyboard
RUN pnpm build

FROM nginx:stable-alpine
# filled in at container start (ANALYTICS_TAG) into /etc/nginx/conf.d/default.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
# no analytics unless the server sets it (must be defined, or nginx sees ${ANALYTICS_TAG} as its own variable)
ENV ANALYTICS_TAG=""
EXPOSE 80
