# Build from the repository root: docker build -f packages/openai-ads-mcp/Dockerfile .
FROM node:24.18.0-bookworm-slim AS dependencies

RUN npm install --global --ignore-scripts pnpm@11.24.0
WORKDIR /build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/openai-ads-mcp/package.json ./packages/openai-ads-mcp/package.json
RUN pnpm install --filter @stark-ai/openai-ads-mcp --prod --frozen-lockfile --ignore-scripts

FROM node:24.18.0-bookworm-slim AS runtime
LABEL org.opencontainers.image.title="stark AI Ads MCP" \
      org.opencontainers.image.source="https://github.com/stark-ai-de/agent-skills" \
      org.opencontainers.image.licenses="Apache-2.0"

ENV NODE_ENV=production \
    ADS_HOST=0.0.0.0 \
    ADS_PORT=8789 \
    ADS_DATABASE_PATH=/var/lib/stark-ai-ads/ads.sqlite
WORKDIR /app

COPY --from=dependencies --chown=node:node /build/node_modules ./node_modules
COPY --from=dependencies --chown=node:node /build/packages/openai-ads-mcp/node_modules ./packages/openai-ads-mcp/node_modules
COPY --chown=node:node packages/openai-ads-mcp/package.json ./packages/openai-ads-mcp/package.json
COPY --chown=node:node packages/openai-ads-mcp/src ./packages/openai-ads-mcp/src
COPY --chown=node:node packages/openai-ads-mcp/references ./packages/openai-ads-mcp/references

RUN mkdir -p /var/lib/stark-ai-ads && chown node:node /var/lib/stark-ai-ads && chmod 0700 /var/lib/stark-ai-ads
USER node
EXPOSE 8789
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.ADS_PORT + '/health').then(response => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"
CMD ["node", "packages/openai-ads-mcp/src/server.mjs"]
