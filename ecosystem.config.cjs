/**
 * pm2 on the Mac mini (same pattern as qwen-onehextwo): a ONE-SHOT job scheduled with
 * cron_restart. Between runs pm2 lists it as "stopped"; that is expected.
 *
 *   pm2 start ecosystem.config.cjs && pm2 save
 *   pm2 logs xrpl-tx-lab-sync
 */
module.exports = {
  apps: [
    {
      name: "xrpl-tx-lab-sync",
      script: "pnpm",
      args: "sync",
      cwd: __dirname,
      interpreter: "none",
      autorestart: false,
      // 12:00 peninsular time (the system TZ is Europe/Madrid)
      cron_restart: "0 12 * * *",
      time: true,
      env: { NODE_ENV: "production", TZ: "Europe/Madrid" },
    },
  ],
};
