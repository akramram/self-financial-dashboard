#!/bin/bash
# Full clean deploy of the financial dashboard (cron-safe wrapper).
# pm2 delete + fresh build + start via ecosystem config + pm2 save.
cd /Users/user/hermes-workspace/self-financial-dashboard || exit 1
npx --yes pm2 delete financial-dashboard >/dev/null 2>&1
rm -rf dist/
npm run build || exit 1
npx --yes pm2 start ecosystem.config.cjs || exit 1
npx --yes pm2 save
