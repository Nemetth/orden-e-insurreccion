-- Políticas RLS para la API Next (clave anon en route handlers).
-- Sin esto: INSERT/UPDATE/DELETE fallan con "violates row-level security policy".

alter table public.entity_types enable row level security;
alter table public.attributes enable row level security;
alter table public.entities enable row level security;
alter table public.entity_values enable row level security;
alter table public.relationships enable row level security;

-- entity_types
create policy "archive_api_select_entity_types"
  on public.entity_types for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_entity_types"
  on public.entity_types for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_entity_types"
  on public.entity_types for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_entity_types"
  on public.entity_types for delete
  to anon, authenticated
  using (true);

-- attributes
create policy "archive_api_select_attributes"
  on public.attributes for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_attributes"
  on public.attributes for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_attributes"
  on public.attributes for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_attributes"
  on public.attributes for delete
  to anon, authenticated
  using (true);

-- entities
create policy "archive_api_select_entities"
  on public.entities for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_entities"
  on public.entities for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_entities"
  on public.entities for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_entities"
  on public.entities for delete
  to anon, authenticated
  using (true);

-- entity_values
create policy "archive_api_select_entity_values"
  on public.entity_values for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_entity_values"
  on public.entity_values for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_entity_values"
  on public.entity_values for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_entity_values"
  on public.entity_values for delete
  to anon, authenticated
  using (true);

-- relationships
create policy "archive_api_select_relationships"
  on public.relationships for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_relationships"
  on public.relationships for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_relationships"
  on public.relationships for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_relationships"
  on public.relationships for delete
  to anon, authenticated
  using (true);
