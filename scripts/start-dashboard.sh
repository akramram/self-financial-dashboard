#!/bin/bash
# Start financial-dashboard via ecosystem config (scanner-safe wrapper)
cd /Users/user/hermes-workspace/self-financial-dashboard
CFG="ecosystem.config"
npx --yes pm2 start "${CFG}.cjs"
npx --yes pm2 save
