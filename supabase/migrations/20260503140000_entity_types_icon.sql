-- Ícono Lucide (nombre de componente) para tipos de entidad en la UI
alter table public.entity_types
add column if not exists icon text not null default 'Box';

comment on column public.entity_types.icon is 'Nombre del ícono lucide-react (p. ej. Box, User).';
