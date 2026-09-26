FROM docker.io/library/node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

WORKDIR /srv/kortek
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter api --frozen-lockfile

COPY apps/api/prisma apps/api/prisma
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/tsconfig.build.json apps/api/tsconfig.build.json
COPY apps/api/nest-cli.json apps/api/nest-cli.json
RUN pnpm --filter api exec prisma generate \
 && pnpm --filter api build

WORKDIR /srv/kortek/apps/api
USER node
CMD ["node", "dist/notifications/email-worker.cli.js"]
