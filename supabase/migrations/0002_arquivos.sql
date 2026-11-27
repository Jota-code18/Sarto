-- Arquivos (fotos, PDFs, modelos) num bucket privado. O caminho começa pela coleção: "dossies/abc/cert.pdf".
-- Quem não pode ler a coleção não vê nem baixa o arquivo. Nada de link público.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 15728640, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

create policy arquivos_ler on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.posso(split_part(name, '/', 1), false));
create policy arquivos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.posso(split_part(name, '/', 1), true));
create policy arquivos_trocar on storage.objects for update to authenticated
  using (bucket_id = 'documentos' and public.posso(split_part(name, '/', 1), true))
  with check (bucket_id = 'documentos' and public.posso(split_part(name, '/', 1), true));
create policy arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and public.posso(split_part(name, '/', 1), true));
