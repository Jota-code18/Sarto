-- Base do painel: usuários, permissões por coleção e registros. Ainda não aplicada: ver a issue do Supabase.
-- Sem cadastro aberto: quem entra sem convite não vê nada.
create type public.perfil as enum ('socios', 'comercial', 'locacao', 'juridico', 'marketing', 'corretor');

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete restrict,
  nome text not null check (length(nome) between 1 and 120),
  email text not null unique,
  tel text not null default '',
  perfil public.perfil not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.permissoes (
  colecao text not null,
  perfil public.perfil not null,
  ler boolean not null default false,
  gravar boolean not null default false,
  primary key (colecao, perfil)
);

create table public.registros (
  colecao text not null check (colecao ~ '^[a-zA-Z]{2,30}$'),
  id text not null check (length(id) between 1 and 60),
  dados jsonb not null,
  criado_por uuid not null default auth.uid() references auth.users (id),
  atualizado_por uuid not null default auth.uid() references auth.users (id),
  atualizado_em timestamptz not null default now(),
  primary key (colecao, id)
);

create table public.auditoria (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  quem uuid,
  colecao text not null,
  registro text not null,
  acao text not null
);

create function public.meu_perfil() returns public.perfil
language sql stable security definer set search_path = ''
as $$ select u.perfil from public.usuarios u where u.id = (select auth.uid()) and u.ativo $$;

create function public.posso(c text, grava boolean) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.permissoes p
    where p.colecao = c and p.perfil = public.meu_perfil() and case when grava then p.gravar else p.ler end
  )
$$;

-- quem gravou e quando vem do servidor, nunca do navegador
create function public.carimbar() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.atualizado_por := auth.uid();
  new.atualizado_em := now();
  if tg_op = 'INSERT' then new.criado_por := auth.uid(); else new.criado_por := old.criado_por; end if;
  return new;
end $$;

create function public.auditar() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.auditoria (quem, colecao, registro, acao)
  values (auth.uid(), coalesce(new.colecao, old.colecao), coalesce(new.id, old.id), lower(tg_op));
  return null;
end $$;

create trigger carimbo before insert or update on public.registros for each row execute function public.carimbar();
create trigger trilha after insert or update or delete on public.registros for each row execute function public.auditar();

alter table public.usuarios enable row level security;
alter table public.permissoes enable row level security;
alter table public.registros enable row level security;
alter table public.auditoria enable row level security;

create policy usuarios_ler on public.usuarios for select to authenticated using (public.meu_perfil() is not null);
create policy usuarios_criar on public.usuarios for insert to authenticated with check (public.meu_perfil() = 'socios');
create policy usuarios_mudar on public.usuarios for update to authenticated using (public.meu_perfil() = 'socios') with check (public.meu_perfil() = 'socios');
create policy permissoes_ler on public.permissoes for select to authenticated using (public.meu_perfil() is not null);
create policy registros_ler on public.registros for select to authenticated using (public.posso(colecao, false));
create policy registros_criar on public.registros for insert to authenticated with check (public.posso(colecao, true));
create policy registros_mudar on public.registros for update to authenticated using (public.posso(colecao, true)) with check (public.posso(colecao, true));
create policy registros_apagar on public.registros for delete to authenticated using (public.posso(colecao, true));
create policy auditoria_ler on public.auditoria for select to authenticated using (public.meu_perfil() = 'socios');

revoke all on public.usuarios, public.permissoes, public.registros, public.auditoria from anon, authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.meu_perfil(), public.posso(text, boolean) to authenticated;
grant select, insert, update on public.usuarios to authenticated;
grant select on public.permissoes, public.auditoria to authenticated;
grant select, insert, update, delete on public.registros to authenticated;

-- ponto de partida: espelha src/lib/telas.ts. Sócios veem e gravam tudo.
insert into public.permissoes (colecao, perfil, ler, gravar)
select c, p, true, true
from (values
  ('leads', array['comercial', 'corretor', 'marketing']),
  ('captacoes', array['comercial', 'corretor', 'locacao']),
  ('anuncios', array['comercial']),
  ('notas', array['comercial', 'marketing']),
  ('corretores', array['comercial', 'marketing']),
  ('contratos', array['locacao']),
  ('cobrancas', array['locacao']),
  ('contasInquilino', array['locacao']),
  ('repasses', array['locacao']),
  ('chamados', array['locacao']),
  ('multas', array['locacao']),
  ('funil', array['locacao', 'comercial']),
  ('vendas', array['comercial', 'juridico', 'locacao']),
  ('dossies', array['comercial', 'juridico', 'locacao']),
  ('modelos', array['juridico']),
  ('minutas', array['comercial', 'juridico', 'locacao']),
  ('contasPagar', array['locacao']),
  ('lancamentos', array['locacao']),
  ('posts', array['marketing', 'comercial']),
  ('metricas', array['marketing']),
  ('eventos', array['comercial', 'locacao', 'juridico', 'marketing', 'corretor']),
  ('rotinas', array['comercial', 'locacao', 'juridico', 'marketing', 'corretor']),
  ('estoque', array['comercial', 'locacao', 'juridico', 'marketing', 'corretor']),
  ('aniversarios', array['comercial', 'locacao', 'juridico', 'marketing', 'corretor']),
  ('registros', array['comercial', 'locacao', 'juridico', 'marketing', 'corretor']),
  ('custos', array[]::text[]),
  ('pendencias', array['comercial', 'locacao', 'juridico', 'marketing'])
) as t (c, perfis)
cross join lateral unnest(array_append(perfis, 'socios')::public.perfil[]) as p;
