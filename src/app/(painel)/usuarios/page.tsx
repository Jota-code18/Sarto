"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Formulario, type GrupoDef } from "@/componentes/formulario";
import { Botao, Cabecalho, Cartao, Gaveta, Nota, Selo, Vazio } from "@/componentes/ui";
import { hoje } from "@/lib/datas";
import { novoId } from "@/lib/formato";
import { PERFIS } from "@/lib/regras";
import { acao, useSarto } from "@/lib/store";
import { MENU } from "@/lib/telas";
import type { Perfil, Usuario } from "@/lib/tipos";

const LISTA = Object.keys(PERFIS) as Perfil[];
const GRUPOS: GrupoDef[] = [
  {
    grupo: "",
    campos: [
      { k: "nome", nome: "Nome", col: 6, obrigatorio: true },
      { k: "email", nome: "E-mail", tipo: "email", col: 3, obrigatorio: true, dica: "Receberá o convite quando o login for ligado" },
      { k: "tel", nome: "WhatsApp", tipo: "tel", col: 3 },
      { k: "perfil", nome: "Perfil", tipo: "opcoes", col: 3, opcoes: LISTA.map((p) => ({ id: p, nome: PERFIS[p].area })) },
      { k: "ativo", nome: "Pode usar o painel", tipo: "sim", col: 3 },
    ],
  },
];
const novo = (): Usuario => ({ id: novoId(), nome: "", email: "", tel: "", perfil: "corretor", ativo: true, criadoEm: hoje() });
const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function Usuarios() {
  const usuarios = useSarto((s) => s.dados.usuarios);
  const { salvar, avisar, registrar } = acao();
  const [u, setU] = useState<Usuario | null>(null);
  const repetido = !!u && usuarios.some((x) => x.id !== u.id && x.email.trim().toLowerCase() === u.email.trim().toLowerCase());

  return (
    <>
      <Cabecalho area="GESTÃO USUÁRIOS" titulo="Usuários" texto="Quem usa o painel e o que cada perfil vê.">
        <Botao tom="cheio" onClick={() => setU(novo())}>
          <Plus size={16} /> Novo usuário
        </Botao>
      </Cabecalho>
      <div className="mb-6">
        <Nota>
          O login individual está desligado. Cadastre a equipe agora: estes nomes já aparecem em “Usando como” e nos registros, e viram os convites quando o login for ligado.
        </Nota>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="min-w-0">
          {usuarios.length === 0 ? (
            <Vazio acao={<Botao onClick={() => setU(novo())}>Cadastrar a primeira pessoa</Botao>}>Ninguém cadastrado.</Vazio>
          ) : (
            <ul className="divide-y divide-linha border-y border-linha">
              {usuarios.map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => setU(x)}
                    className="flex min-h-14 w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-left hover:bg-linho"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{x.nome}</span>
                      <span className="block break-words text-[13px] text-cinza">{x.email}</span>
                    </span>
                    <span className="flex gap-1.5">
                      <Selo>{PERFIS[x.perfil].area}</Selo>
                      {!x.ativo && <Selo tom="alerta">Sem acesso</Selo>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Cartao titulo="O que cada perfil vê" className="self-start">
          <ul className="divide-y divide-linha">
            {LISTA.map((p) => {
              const telas = MENU.flatMap((g) => g.itens).filter((i) => !i.perfis || i.perfis.includes(p));
              return (
                <li key={p}>
                  <details>
                    <summary className="flex min-h-11 items-center justify-between gap-3">
                      <span className="font-medium">{PERFIS[p].area}</span>
                      <span className="text-[13px] tabular-nums text-cinza">{telas.length} seções</span>
                    </summary>
                    <p className="pb-3 text-[13px] text-cinza">{telas.map((i) => i.nome).join(", ")}</p>
                  </details>
                </li>
              );
            })}
          </ul>
        </Cartao>
      </div>
      <Gaveta
        aberta={!!u}
        titulo={u?.nome || "Novo usuário"}
        onFecha={() => setU(null)}
        rodape={
          u && (
            <Botao
              tom="cheio"
              disabled={!u.nome.trim() || !emailValido(u.email) || repetido}
              onClick={() => {
                salvar("usuarios", u);
                registrar("Usuários", `salvou ${u.nome}, perfil ${PERFIS[u.perfil].area}`);
                // a troca de perfil ou de acesso vale na hora para quem está usando
                const s = useSarto.getState();
                if (s.usuarioId === u.id) {
                  if (u.ativo) s.setUsuario(u.id);
                  else s.setPerfil(u.perfil);
                }
                avisar("Usuário salvo");
                setU(null);
              }}
            >
              Salvar usuário
            </Botao>
          )
        }
      >
        {u && (
          <>
            <Formulario grupos={GRUPOS} valor={u} onMuda={setU} />
            {repetido && (
              <div className="mt-4">
                <Nota tom="erro">Já existe alguém com este e-mail.</Nota>
              </div>
            )}
          </>
        )}
      </Gaveta>
    </>
  );
}
