// Procura chave, token e senha no código versionado e no pacote que vai ao navegador.
// Uso: node scripts/segredos.mjs   (rode depois do build para olhar .next/static)
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const PADROES = [
  ["chave da Apify", /apify_api_[A-Za-z0-9]{20,}/],
  ["chave da Anthropic", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["chave secreta genérica", /\bsk_(live|test)_[A-Za-z0-9]{16,}/],
  ["token do GitHub", /\b(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/],
  ["chave da AWS", /\bAKIA[0-9A-Z]{16}\b/],
  ["chave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["chave do Asaas", /\$aact_[A-Za-z0-9]{20,}/],
  ["token do Meta", /\bEAA[A-Za-z0-9]{60,}/],
  ["JWT de serviço do Supabase", /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZS/],
];
// nome de variável de servidor dentro do pacote do navegador indica código de servidor vazando
const SO_SERVIDOR = [
  "APIFY_TOKEN",
  "PAINEL_SENHA",
  "CRON_SECRET",
  "WEBSERVICE_JETIMOB_KEY",
  "WHATSAPP_TOKEN",
  "WHATSAPP_APP_SECRET",
  "ASAAS_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SENTRY_AUTH_TOKEN",
];

const achados = [];
const olhar = (arq, texto, servidor) => {
  for (const [nome, re] of PADROES) if (re.test(texto)) achados.push(`${arq}: ${nome}`);
  if (servidor) for (const v of SO_SERVIDOR) if (texto.includes(v)) achados.push(`${arq}: ${v} no código do navegador`);
};

const versionados = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !/\.(png|jpe?g|webp|ttf|woff2?|ico|pdf)$/i.test(f) && f !== "scripts/segredos.mjs");
for (const f of versionados) if (existsSync(f) && statSync(f).size < 2e6) olhar(f, readFileSync(f, "utf8"), false);

const pasta = ".next/static";
const andar = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? andar(path.join(d, e.name)) : [path.join(d, e.name)]));
if (existsSync(pasta)) for (const f of andar(pasta).filter((x) => /\.(js|css|html|json|map)$/.test(x))) olhar(f, readFileSync(f, "utf8"), true);
else console.log("Sem .next/static: rode o build para conferir o pacote do navegador.");

if (achados.length) {
  console.error(`Possível segredo exposto:\n${achados.map((a) => `- ${a}`).join("\n")}`);
  process.exit(1);
}
console.log(`Nenhum segredo encontrado (${versionados.length} arquivos versionados${existsSync(pasta) ? " e pacote do navegador" : ""}).`);
