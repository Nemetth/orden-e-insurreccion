-- Historia cronológica por entidad (años + atributos históricos por tipo + valores opt-in)

create table public.entity_history_years (
  id uuid primary key default gen_random_uuid (),
  entity_id uuid not null references public.entities (id) on delete cascade,
  year integer not null,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  constraint entity_history_years_entity_id_year_key unique (entity_id, year)
);

create index entity_history_years_entity_id_idx on public.entity_history_years (entity_id);

comment on table public.entity_history_years is 'Marcadores de año por entidad; los valores históricos cuelgan de cada año.';

create table public.history_attribute_types (
  id uuid primary key default gen_random_uuid (),
  entity_type_id uuid not null references public.entity_types (id) on delete cascade,
  key text not null,
  label text not null,
  value_type text not null,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  constraint history_attribute_types_entity_type_id_key_key unique (entity_type_id, key),
  constraint history_attribute_types_key_not_empty check (char_length(trim(key)) > 0),
  constraint history_attribute_types_value_type_check check (
    value_type = any (
      array[
        'text'::text,
        'long_text'::text,
        'number'::text,
        'boolean'::text,
        'date'::text
      ]
    )
  )
);

create index history_attribute_types_entity_type_id_idx on public.history_attribute_types (entity_type_id);

comment on table public.history_attribute_types is 'Definición de campos históricos por tipo de entidad (propagables en UI a todas las entidades del tipo).';

create table public.entity_history_values (
  id uuid primary key default gen_random_uuid (),
  history_year_id uuid not null references public.entity_history_years (id) on delete cascade,
  history_attribute_type_id uuid not null references public.history_attribute_types (id) on delete cascade,
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_date date,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  constraint entity_history_values_year_attr_key unique (history_year_id, history_attribute_type_id)
);

create index entity_history_values_history_year_id_idx on public.entity_history_values (history_year_id);

create index entity_history_values_history_attribute_type_id_idx on public.entity_history_values (history_attribute_type_id);

comment on table public.entity_history_values is 'Valor instanciado para un año y un atributo histórico (creación explícita, sin auto-fill).';

-- RLS (misma convención que archive_api)
alter table public.entity_history_years enable row level security;
alter table public.history_attribute_types enable row level security;
alter table public.entity_history_values enable row level security;

create policy "archive_api_select_entity_history_years"
  on public.entity_history_years for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_entity_history_years"
  on public.entity_history_years for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_entity_history_years"
  on public.entity_history_years for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_entity_history_years"
  on public.entity_history_years for delete
  to anon, authenticated
  using (true);

create policy "archive_api_select_history_attribute_types"
  on public.history_attribute_types for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_history_attribute_types"
  on public.history_attribute_types for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_history_attribute_types"
  on public.history_attribute_types for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_history_attribute_types"
  on public.history_attribute_types for delete
  to anon, authenticated
  using (true);

create policy "archive_api_select_entity_history_values"
  on public.entity_history_values for select
  to anon, authenticated
  using (true);

create policy "archive_api_insert_entity_history_values"
  on public.entity_history_values for insert
  to anon, authenticated
  with check (true);

create policy "archive_api_update_entity_history_values"
  on public.entity_history_values for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "archive_api_delete_entity_history_values"
  on public.entity_history_values for delete
  to anon, authenticated
  using (true);
