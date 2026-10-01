const fs = require('node:fs');
const path = require('node:path');

// KUR-40: AKSes (KSEI) bearer token. Stored in gitignored data/ksei.json,
// rotated via scripts/rotate-ksei-token.sh (which restarts this app). Read at
// PM2 start and injected as KSEI_BEARER_TOKEN — the app itself never reads
// the token file at runtime when the env var is present.
let kseiToken = process.env.KSEI_BEARER_TOKEN || '';
if (!kseiToken) {
  try {
    kseiToken = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'ksei.json'), 'utf8')
    ).token;
  } catch {
    kseiToken = '';
  }
}

module.exports = {
  apps: [
    {
      name: 'financial-dashboard',
      script: 'dist/server/entry.mjs',
      cwd: __dirname,
      env: {
        HOST: '0.0.0.0',
        PORT: 4321,
        NODE_ENV: 'production',
        ...(kseiToken ? { KSEI_BEARER_TOKEN: kseiToken } : {}),
      },
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
    },
  ],
};
