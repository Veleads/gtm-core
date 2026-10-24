#!/bin/sh
# Apply this core version's database migrations, then start taking jobs.
set -e
cd /app/db && ./node_modules/.bin/prisma migrate deploy
cd /app/workers && exec ./node_modules/.bin/tsx src/main.ts
