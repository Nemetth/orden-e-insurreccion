-- Reemplazo del mapa SVG por esquema Leaflet (Argentina): posiciones lat/lng y ciudades preset

drop table if exists public.map_regions cascade;
drop table if exists public.world_map cascade;
drop table if exists public.entity_map_positions cascade;

create table public.entity_map_positions (
  id uuid primary key default gen_random_uuid (),
  entity_id uuid not null references public.entities (id) on delete cascade,
  lat numeric not null,
  lng numeric not null,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  constraint entity_map_positions_entity_id_key unique (entity_id)
);

create index entity_map_positions_entity_id_idx on public.entity_map_positions (entity_id);

create table public.map_locations (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  lat numeric not null,
  lng numeric not null,
  is_preset boolean not null default false,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  constraint map_locations_name_not_empty check (char_length(trim(name)) > 0)
);

create index map_locations_is_preset_idx on public.map_locations (is_preset);

insert into public.map_locations (name, lat, lng, is_preset)
values
  ('Buenos Aires', -34.6037, -58.3816, true),
  ('Córdoba', -31.4135, -64.1811, true),
  ('Rosario', -32.9442, -60.6505, true),
  ('Mendoza', -32.8908, -68.8272, true),
  ('Tucumán', -26.8083, -65.2176, true);

alter table public.entity_map_positions enable row level security;
alter table public.map_locations enable row level security;

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

create policy "archive_api_select_map_locations"
  on public.map_locations for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_map_locations"
  on public.map_locations for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_map_locations"
  on public.map_locations for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_map_locations"
  on public.map_locations for delete
  to anon, authenticated
  using (true);
