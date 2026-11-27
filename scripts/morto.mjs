// Knip sem a leitura em bloco grande, que falha por memória em algumas máquinas Windows
import { spawnSync } from "node:child_process";
const r = spawnSync("npx", ["knip"], { stdio: "inherit", shell: true, env: { ...process.env, KNIP_DISABLE_RAW_TRANSFER: "1" } });
process.exit(r.status ?? 1);
