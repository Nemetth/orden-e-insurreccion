-- Regiones dibujadas en el mapa (GeoJSON)

create table public.map_regions (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  color text not null default '#8b1a1a',
  geojson jsonb not null,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  constraint map_regions_name_not_empty check (char_length(trim(name)) > 0)
);

create index map_regions_created_at_idx on public.map_regions (created_at desc);

alter table public.map_regions enable row level security;

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
