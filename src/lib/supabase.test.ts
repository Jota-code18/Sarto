import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { dadosVazios } from "./base";
import { podeVer } from "./telas";

/** A migração real num Postgres embutido: as políticas são testadas, não lidas */
const db = new PGlite();
const ID = (n: number) => `00000000-0000-0000-0000-00000000000${n}`;
const [SOCIO, LOCACAO, CORRETOR, INATIVO, SEM_CONVITE] = [1, 2, 3, 4, 5].map(ID);

async function como<T>(quem: string | null, sql: string): Promise<T[]> {
  await db.exec(`begin; set local role ${quem ? "authenticated" : "anon"}; set local test.uid = '${quem ?? ""}';`);
  try {
    const r = await db.query<T>(sql);
    await db.exec("commit");
    return r.rows;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
const grava = (quem: string | null, colecao: string, id: string) =>
  como(quem, `insert into public.registros (colecao, id, dados) values ('${colecao}', '${id}', '{}') returning criado_por`);

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);
  await db.exec(readFileSync("supabase/migrations/0001_base.sql", "utf8"));
  for (const id of [SOCIO, LOCACAO, CORRETOR, INATIVO, SEM_CONVITE]) await db.exec(`insert into auth.users values ('${id}')`);
  await db.exec(`insert into public.usuarios (id, nome, email, perfil, ativo) values
    ('${SOCIO}', 'S', 's@x', 'socios', true), ('${LOCACAO}', 'L', 'l@x', 'locacao', true), ('${CORRETOR}', 'C', 'c@x', 'corretor', true), ('${INATIVO}', 'I', 'i@x', 'socios', false)`);
}, 60000);

describe("políticas do banco", () => {
  it("cada perfil grava e lê só o que é dele", async () => {
    await grava(LOCACAO, "contratos", "c1");
    await grava(CORRETOR, "leads", "l1");
    await expect(grava(CORRETOR, "contratos", "c2")).rejects.toThrow(/row-level security/);
    expect(await como(CORRETOR, "select * from public.registros where colecao = 'contratos'")).toEqual([]);
    expect(await como(SOCIO, "select id from public.registros order by id")).toEqual([{ id: "c1" }, { id: "l1" }]);
  });
  it("sem convite, desativado ou sem login não vê nem grava", async () => {
    for (const q of [INATIVO, SEM_CONVITE]) {
      expect(await como(q, "select * from public.registros")).toEqual([]);
      expect(await como(q, "select * from public.usuarios")).toEqual([]);
      await expect(grava(q, "leads", "x")).rejects.toThrow();
    }
    await expect(como(null, "select * from public.registros")).rejects.toThrow(/permission denied/);
    await expect(como(null, "select * from public.usuarios")).rejects.toThrow(/permission denied/);
  });
  it("ninguém sobe o próprio perfil nem mexe na trilha", async () => {
    await como(CORRETOR, `update public.usuarios set perfil = 'socios' where id = '${CORRETOR}'`);
    expect(await como(SOCIO, `select perfil from public.usuarios where id = '${CORRETOR}'`)).toEqual([{ perfil: "corretor" }]);
    await expect(como(SEM_CONVITE, `insert into public.usuarios (id, nome, email, perfil) values ('${SEM_CONVITE}', 'x', 'x', 'socios')`)).rejects.toThrow(/row-level security/);
    await expect(como(SOCIO, "delete from public.auditoria")).rejects.toThrow(/permission denied/);
    await expect(como(LOCACAO, "update public.permissoes set gravar = true")).rejects.toThrow(/permission denied/);
    expect((await como<{ acao: string }>(SOCIO, "select acao from public.auditoria")).length).toBeGreaterThan(0);
  });
  it("autor vem do servidor, mesmo se o navegador mentir", async () => {
    await como(LOCACAO, `update public.registros set criado_por = '${SOCIO}', atualizado_por = '${SOCIO}' where id = 'c1'`);
    expect(await como(SOCIO, "select criado_por, atualizado_por from public.registros where id = 'c1'")).toEqual([{ criado_por: LOCACAO, atualizado_por: LOCACAO }]);
  });
  it("toda coleção do painel tem permissão definida", async () => {
    const { rows } = await db.query<{ colecao: string }>("select distinct colecao from public.permissoes");
    const fora = new Set(["usuarios", "logs"]);
    expect(rows.map((r) => r.colecao).sort()).toEqual(
      Object.keys(dadosVazios())
        .filter((c) => !fora.has(c))
        .sort(),
    );
  });
});

describe("telas por perfil", () => {
  it("decide pela tela mais específica", () => {
    expect(podeVer("corretor", "/locacao/cobrancas")).toBe(false);
    expect(podeVer("comercial", "/locacao/funil")).toBe(true);
    expect(podeVer("comercial", "/locacao")).toBe(false);
    expect(podeVer("corretor", "/")).toBe(true);
    expect(podeVer("corretor", "/leads")).toBe(true);
    expect(podeVer("locacao", "/usuarios")).toBe(false);
  });
});
