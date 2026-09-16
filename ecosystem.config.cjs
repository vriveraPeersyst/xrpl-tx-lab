/**
 * pm2 en el Mac mini (mismo patrón que qwen-onehextwo): job ONE-SHOT programado con
 * cron_restart. Entre ejecuciones pm2 lo lista como "stopped"; es lo esperado.
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
      // 12:00 hora peninsular (la TZ del sistema es Europe/Madrid)
      cron_restart: "0 12 * * *",
      time: true,
      env: { NODE_ENV: "production", TZ: "Europe/Madrid" },
    },
  ],
};
