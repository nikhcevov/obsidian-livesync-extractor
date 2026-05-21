FROM node:20-alpine AS build
WORKDIR /app
COPY publisher/package.json publisher/package-lock.json* publisher/tsconfig.json ./
RUN npm ci 2>/dev/null || npm install
COPY publisher/src ./src
RUN npm run build && npm prune --omit=dev

FROM debian:bookworm-slim AS hugo
ARG HUGO_VERSION=0.146.0
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    ARCH="${TARGETARCH:-amd64}" && \
    curl -fsSL -o /tmp/hugo.tar.gz \
    "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-${ARCH}.tar.gz" && \
    tar -xzf /tmp/hugo.tar.gz -C /usr/local/bin hugo && \
    chmod +x /usr/local/bin/hugo && \
    hugo version && \
    apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* /tmp/hugo.tar.gz

FROM node:20-alpine AS site
RUN apk add --no-cache git
WORKDIR /site-src
COPY site ./site
RUN if [ ! -f site/themes/PaperMod/theme.toml ]; then \
    git clone --depth 1 https://github.com/adityatelange/hugo-PaperMod site/themes/PaperMod; \
    fi

FROM node:20-bookworm-slim
ARG VERSION=dev
LABEL org.opencontainers.image.title="livesync-publisher" \
    org.opencontainers.image.version="${VERSION}"
ENV APP_VERSION="${VERSION}"
RUN apt-get update && apt-get install -y --no-install-recommends \
    gettext-base tini gosu ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=hugo /usr/local/bin/hugo /usr/local/bin/hugo
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json
COPY --from=site /site-src/site /app/site
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /site /public /state
WORKDIR /app
ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
CMD ["node", "/app/dist/index.js"]
