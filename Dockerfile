# ADOPTED FROM: https://github.com/Pocket/pocket-monorepo/tree/main
# Adapted from https://turbo.build/repo/docs/handbook/deploying-with-docker
# and https://github.com/vercel/turbo/issues/5462#issuecomment-1624792583

#----------------------------------------
# Docker build step that creates our 
# base image used in all steps
#----------------------------------------
FROM node:18.18-alpine AS base

ARG SCOPE
ARG PORT
ARG GIT_SHA

## Add curl for health checks
RUN apk add --no-cache curl

## Add turbo and pnpm to all followup builder images
# Dockerfile
RUN corepack enable && corepack prepare pnpm@latest --activate
# Enable `pnpm add --global` on Alpine Linux by setting
# home location environment variable to a location already in $PATH
# https://github.com/pnpm/pnpm/issues/784#issuecomment-1518582235
ENV PNPM_HOME=/usr/local/bin
RUN pnpm add -g turbo pnpm

#----------------------------------------
# Docker build step that prunes down to 
# the active project.
#----------------------------------------
FROM base AS setup
ARG SCOPE
ARG PORT
ARG GIT_SHA

RUN apk add --no-cache curl
RUN apk update
# Set working directory
WORKDIR /app
COPY . .
# Prune the structure to an optimized folder structure with just the `scopes` app dependencies. 
RUN turbo prune --scope=$SCOPE --docker

#----------------------------------------
# Docker build step that:
# 1. Installs all the dependencies
# 2. Builds the application
# 3. Exports it as a built application
#----------------------------------------
# Add lockfile and package.json's of isolated subworkspace
FROM base AS builder
ARG SCOPE
ARG PORT
ARG GIT_SHA

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=setup /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=setup /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# First install dependencies (as they change less often)
COPY --from=setup /app/out/json/ ./
RUN pnpm install --filter=${SCOPE} --frozen-lockfile

# Build the project and its dependencies
COPY --from=setup /app/out/full/ ./
COPY turbo.json turbo.json
RUN pnpm run build --filter=${SCOPE}...

## Installing only the dev dependencies after we used them to build
RUN rm -rf node_modules/ && pnpm install --prod --filter=${SCOPE} --frozen-lockfile
RUN pnpm --filter=$SCOPE --prod deploy pruned

#----------------------------------------
# Docker build step that:
# 1. Sets up our actual runner
#----------------------------------------
FROM base AS runners
ARG PORT
ARG GIT_SHA

WORKDIR /app
COPY --from=builder /app/pruned/ ./
# Bug in PNPM that is not grabbing all the deps with a deploy, so we need to copy it all
# https://github.com/pnpm/pnpm/issues/6259
COPY --from=builder /app/node_modules/ ./node_modules/

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

ENV NODE_ENV=production
ENV PORT $PORT
ENV GIT_SHA=${GIT_SHA}
ENV AWS_XRAY_CONTEXT_MISSING=LOG_ERROR
ENV AWS_XRAY_LOG_LEVEL=silent

EXPOSE $PORT
CMD npm run start
