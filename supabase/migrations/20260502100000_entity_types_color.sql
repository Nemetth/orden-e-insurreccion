-- Color para UI de tipos de entidad (API Fase 2)
alter table public.entity_types
add column if not exists color text not null default '#64748b';

comment on column public.entity_types.color is 'Color de presentación (p. ej. hex CSS).';
