/** Contratos de arquitetura: quem pode importar quem. Ver AGENTS.md */
const proibido = (name, comment, from, to) => ({ name, comment, severity: "error", from, to });
export default {
  forbidden: [
    proibido("sem-ciclo", "Dependência circular", {}, { circular: true, viaOnly: { dependencyTypesNot: ["type-only"] } }),
    proibido("regra-sem-tela", "src/lib não conhece tela", { path: "^src/lib" }, { path: "^src/(app|componentes)" }),
    proibido("regra-sem-react", "Regra de negócio não usa React nem Next", { path: "^src/lib" }, { path: "^node_modules/(react|react-dom|next)/" }),
    proibido("peca-sem-tela", "Componente não importa tela", { path: "^src/componentes" }, { path: "^src/app" }),
    proibido("tela-isolada", "Uma tela não importa outra", { path: "^src/app/[(]painel[)]/(.+)/page" }, { path: "^src/app/[(]painel[)]/", pathNot: "^src/app/[(]painel[)]/$1/" }),
    proibido(
      "segredo-so-no-servidor",
      "Só rota de servidor fala com a Apify",
      { path: "^src", pathNot: "^src/(app/api|lib/apify|.*[.]test[.]ts$)" },
      { path: "^src/lib/apify[.]ts$" },
    ),
    proibido("rota-sem-loja", "Rota de servidor não usa o armazenamento do navegador", { path: "^src/app/api" }, { path: "^src/lib/store" }),
  ],
  options: { doNotFollow: { path: "node_modules" }, tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.json" } },
};
