-- Orden e Insurrección — schema grafo + EAV (Fase 1)
-- Ejecutar en Supabase: SQL Editor o supabase db push

-- ---------------------------------------------------------------------------
-- Tipos de entidad del catálogo (personaje, lugar, facción, etc.)
-- ---------------------------------------------------------------------------
create table public.entity_types (
  id uuid primary key default gen_random_uuid (),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  updated_at timestamptz not null default timezone ('utc'::text, now()),
  constraint entity_types_slug_not_empty check (char_length(trim(slug)) > 0)
);

comment on table public.entity_types is 'Definición de tipos de entidad del mundo (schema dinámico por tipo).';

-- ---------------------------------------------------------------------------
-- Atributos declarados por tipo (clave/label/tipo de valor)
-- ---------------------------------------------------------------------------
create table public.attributes (
  id uuid primary key default gen_random_uuid (),
  entity_type_id uuid not null references public.entity_types (id) on delete cascade,
  key text not null,
  label text not null,
  value_type text not null,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  constraint attributes_entity_type_id_key unique (entity_type_id, key),
  constraint attributes_key_not_empty check (char_length(trim(key)) > 0),
  constraint attributes_value_type_check check (
    value_type = any (
      array[
        'text'::text,
        'long_text'::text,
        'number'::text,
        'boolean'::text,
        'date'::text,
        'json'::text,
        'entity_ref'::text
      ]
    )
  )
);

create index attributes_entity_type_id_idx on public.attributes (entity_type_id);

comment on table public.attributes is 'Atributos por entity_type: moldea el formulario y las columnas EAV en entity_values.';

-- ---------------------------------------------------------------------------
-- Entidades (nodos del grafo)
-- ---------------------------------------------------------------------------
create table public.entities (
  id uuid primary key default gen_random_uuid (),
  entity_type_id uuid not null references public.entity_types (id) on delete restrict,
  slug text,
  name text not null,
  summary text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  updated_at timestamptz not null default timezone ('utc'::text, now()),
  constraint entities_name_not_empty check (char_length(trim(name)) > 0)
);

create index entities_entity_type_id_idx on public.entities (entity_type_id);

create unique index entities_entity_type_slug_uidx on public.entities (entity_type_id, slug)
where
  slug is not null;

comment on table public.entities is 'Instancias de worldbuilding; cada fila es un nodo tipado.';

-- ---------------------------------------------------------------------------
-- Valores EAV (una fila por par entidad-atributo)
-- ---------------------------------------------------------------------------
create table public.entity_values (
  id uuid primary key default gen_random_uuid (),
  entity_id uuid not null references public.entities (id) on delete cascade,
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  value_text text,
  value_numeric numeric,
  value_boolean boolean,
  value_timestamptz timestamptz,
  value_json jsonb,
  ref_entity_id uuid references public.entities (id) on delete set null,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  updated_at timestamptz not null default timezone ('utc'::text, now()),
  constraint entity_values_entity_id_attribute_id_key unique (entity_id, attribute_id),
  constraint entity_values_ref_scope check (
    ref_entity_id is null
    or ref_entity_id <> entity_id
  )
);

create index entity_values_entity_id_idx on public.entity_values (entity_id);

create index entity_values_attribute_id_idx on public.entity_values (attribute_id);

create index entity_values_ref_entity_id_idx on public.entity_values (ref_entity_id);

comment on table public.entity_values is 'Valores dinámicos; usar columnas según attributes.value_type.';

-- ---------------------------------------------------------------------------
-- Relaciones dirigidas entre entidades (aristas del grafo)
-- ---------------------------------------------------------------------------
create table public.relationships (
  id uuid primary key default gen_random_uuid (),
  source_entity_id uuid not null references public.entities (id) on delete cascade,
  target_entity_id uuid not null references public.entities (id) on delete cascade,
  relation_key text not null,
  label text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone ('utc'::text, now()),
  constraint relationships_relation_key_not_empty check (char_length(trim(relation_key)) > 0)
);

create index relationships_source_idx on public.relationships (source_entity_id);

create index relationships_target_idx on public.relationships (target_entity_id);

create index relationships_relation_key_idx on public.relationships (relation_key);

comment on table public.relationships is 'Aristas: origen → destino con clave semántica (p. ej. ally_of, located_in).';

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.handle_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone ('utc'::text, now());
  return new;
end;
$$;

create trigger entity_types_updated_at
before update on public.entity_types
for each row
execute function public.handle_updated_at ();

create trigger entities_updated_at before update on public.entities for each row
execute function public.handle_updated_at ();

create trigger entity_values_updated_at before update on public.entity_values for each row
execute function public.handle_updated_at ();
