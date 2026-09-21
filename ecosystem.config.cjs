/**
 * pm2 on the Mac mini (same pattern as qwen-onehextwo): a ONE-SHOT job scheduled with
 * cron_restart. Between runs pm2 lists it as "stopped"; that is expected.
 *
 * It fires every hour from 10:00 to 20:00; tools/sync/scheduled.ts exits at once if today's sync
 * already succeeded, so a failed run is simply retried the next hour. Reboots are covered by
 * `pm2 save` + the com.onehextwo.pm2-resurrect LaunchAgent (auto-login on the Mac mini).
 * Accounts are pinned in scheduled.ts: GitHub vriveraPeersyst, Claude vrivera@peersyst.com
 * (CLAUDE_CODE_OAUTH_TOKEN in ~/.config/xrpl-tx-lab/sync.env, not the keychain).
 *
 *   pm2 start ecosystem.config.cjs && pm2 save
 *   pm2 logs xrpl-tx-lab-sync
 */
module.exports = {
  apps: [
    {
      name: "xrpl-tx-lab-sync",
      script: "pnpm",
      args: "sync:scheduled",
      cwd: __dirname,
      interpreter: "none",
      autorestart: false,
      // Every hour 10:00–20:00 peninsular time (the system TZ is Europe/Madrid)
      cron_restart: "0 10-20 * * *",
      time: true,
      env: { NODE_ENV: "production", TZ: "Europe/Madrid" },
    },
  ],
};
