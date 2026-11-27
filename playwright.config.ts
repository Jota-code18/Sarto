import { defineConfig, devices } from "@playwright/test";

const PORTA = 3456;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 4,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "line",
  use: { baseURL: `http://localhost:${PORTA}`, trace: "retain-on-failure", locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [
    { name: "computador", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 740 } } },
  ],
  // a Apify é simulada: nenhum teste gasta crédito
  webServer: [
    { command: "node e2e/apify-simulada.mjs", port: 3991, reuseExistingServer: !process.env.CI },
    {
      command: `npm run start -- -p ${PORTA}`,
      port: PORTA,
      reuseExistingServer: !process.env.CI,
      env: { APIFY_BASE: "http://localhost:3991", APIFY_TOKEN: "simulado", PAINEL_SENHA: "" },
    },
    {
      command: `npm run start -- -p ${PORTA + 1}`,
      port: PORTA + 1,
      reuseExistingServer: !process.env.CI,
      env: {
        APIFY_BASE: "http://localhost:3991",
        APIFY_TOKEN: "simulado",
        PAINEL_SENHA: "senha-de-teste",
        CRON_SECRET: "segredo-de-teste",
        CANALPRO_ROBO_TOKEN: "robo-de-teste-com-mais-de-24-letras",
      },
    },
  ],
});
