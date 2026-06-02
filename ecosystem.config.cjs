module.exports = {
  apps: [{
    name: 'financial-dashboard',
    script: 'dist/server/entry.mjs',
    cwd: '/Users/user/hermes-workspace/self-financial-dashboard',
    env: {
      HOST: '0.0.0.0',
      PORT: 4321,
      NODE_ENV: 'production'
    },
    restart_delay: 3000,
    max_restarts: 10,
    watch: false
  }]
}
