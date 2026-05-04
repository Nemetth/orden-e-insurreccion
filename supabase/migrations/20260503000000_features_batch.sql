-- Batch: documentos clasificados, rumores, tensiones, años de relación, mapa territorial

-- ---------------------------------------------------------------------------
-- Documentos por entidad
-- ---------------------------------------------------------------------------
create table public.entity_documents (
  id uuid primary key default gen_random_uuid (),
  entity_id uuid not null references public.entities (id) on delete cascade,
  title text not null,
  content text,
  classification text not null default 'CLASIFICADO',
  created_at timestamptz not null default timezone ('utc'::text, now()),
  updated_at timestamptz not null default timezone ('utc'::text, now()),
  constraint entity_documents_title_not_empty check (char_length(trim(title)) > 0)
);

create index entity_documents_entity_id_idx on public.entity_documents (entity_id);

create trigger entity_documents_updated_at
before update on public.entity_documents for each row
execute function public.handle_updated_at ();

-- ---------------------------------------------------------------------------
-- Rumores / inteligencia
-- ---------------------------------------------------------------------------
create table public.entity_rumors (
  id uuid primary key default gen_random_uuid (),
  entity_id uuid not null references public.entities (id) on delete cascade,
  source_entity_id uuid references public.entities (id) on delete set null,
  content text not null,
  year integer,
  credibility text not null default 'dudoso',
  created_at timestamptz not null default timezone ('utc'::text, now()),
  constraint entity_rumors_content_not_empty check (char_length(trim(content)) > 0),
  constraint entity_rumors_credibility_check check (
    credibility = any (
      array[
        'confirmado'::text,
        'probable'::text,
        'dudoso'::text,
        'falso'::text
      ]
    )
  )
);

create index entity_rumors_entity_id_idx on public.entity_rumors (entity_id);

create index entity_rumors_source_entity_id_idx on public.entity_rumors (source_entity_id);

-- ---------------------------------------------------------------------------
-- Relaciones: tensión y período temporal
-- ---------------------------------------------------------------------------
alter table public.relationships
add column if not exists tension_level integer not null default 50;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'relationships_tension_level_range'
  ) then
    alter table public.relationships
    add constraint relationships_tension_level_range check (
      tension_level between 0 and 100
    );
  end if;
end $$;

alter table public.relationships
add column if not exists tension_notes text;

alter table public.relationships
add column if not exists year_start integer;

alter table public.relationships
add column if not exists year_end integer;

-- ---------------------------------------------------------------------------
-- Mapa mundial y regiones
-- ---------------------------------------------------------------------------
create table public.world_map (
  id uuid primary key default gen_random_uuid (),
  name text not null default 'Mapa Principal',
  created_at timestamptz not null default timezone ('utc'::text, now()),
  constraint world_map_name_not_empty check (char_length(trim(name)) > 0)
);

create table public.map_regions (
  id uuid primary key default gen_random_uuid (),
  map_id uuid not null references public.world_map (id) on delete cascade,
  name text,
  color text not null default '#1a1a2e',
  path_data text,
  created_at timestamptz not null default timezone ('utc'::text, now())
);

create index map_regions_map_id_idx on public.map_regions (map_id);

create table public.entity_map_positions (
  id uuid primary key default gen_random_uuid (),
  entity_id uuid not null references public.entities (id) on delete cascade,
  map_id uuid not null references public.world_map (id) on delete cascade,
  x numeric not null,
  y numeric not null,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  constraint entity_map_positions_entity_map_key unique (entity_id, map_id)
);

create index entity_map_positions_map_id_idx on public.entity_map_positions (map_id);

-- ---------------------------------------------------------------------------
-- RLS (misma política que el archivo API)
-- ---------------------------------------------------------------------------
alter table public.entity_documents enable row level security;

alter table public.entity_rumors enable row level security;

alter table public.world_map enable row level security;

alter table public.map_regions enable row level security;

alter table public.entity_map_positions enable row level security;

create policy "archive_api_select_entity_documents"
  on public.entity_documents for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_entity_documents"
  on public.entity_documents for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_entity_documents"
  on public.entity_documents for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_entity_documents"
  on public.entity_documents for delete
  to anon, authenticated
  using (true);

create policy "archive_api_select_entity_rumors"
  on public.entity_rumors for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_entity_rumors"
  on public.entity_rumors for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_entity_rumors"
  on public.entity_rumors for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_entity_rumors"
  on public.entity_rumors for delete
  to anon, authenticated
  using (true);

create policy "archive_api_select_world_map"
  on public.world_map for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_world_map"
  on public.world_map for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_world_map"
  on public.world_map for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_world_map"
  on public.world_map for delete
  to anon, authenticated
  using (true);

create policy "archive_api_select_map_regions"
  on public.map_regions for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_map_regions"
  on public.map_regions for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_map_regions"
  on public.map_regions for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_map_regions"
  on public.map_regions for delete
  to anon, authenticated
  using (true);

create policy "archive_api_select_entity_map_positions"
  on public.entity_map_positions for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_entity_map_positions"
  on public.entity_map_positions for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_entity_map_positions"
  on public.entity_map_positions for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_entity_map_positions"
  on public.entity_map_positions for delete
  to anon, authenticated
  using (true);
