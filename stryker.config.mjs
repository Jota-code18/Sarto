/** Testa os testes: muda a regra e vê se algum teste reclama */
export default {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  mutate: ["src/lib/locacao.ts", "src/lib/varredura.ts"],
  ignorePatterns: [".next", "public", "skill", ".playwright-mcp"],
  ignoreStatic: true,
  reporters: ["clear-text", "progress", "html"],
  coverageAnalysis: "perTest",
  incremental: true,
  thresholds: { high: 80, low: 60, break: 40 },
};
