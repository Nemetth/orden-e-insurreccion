import type {
  EntityDocument,
  EntityHistoryPayload,
  EntityHistoryValueWithType,
  EntityMapPositionWithEntity,
  EntityRumorWithSource,
  EntityTypeWithAttributes,
  EntityWithTypeAndValues,
  GlobalHistoryPayload,
  MapLocationRow,
  MapRegionRow,
  RelationshipWithEntities,
  RumorCredibility,
} from "@/types/api";
import type {
  AttributeValueType,
  Database,
  HistoryAttributeValueType,
  Json,
} from "@/types/database";

type AttributeRow = Database["public"]["Tables"]["attributes"]["Row"];
type HistoryAttributeTypeRow =
  Database["public"]["Tables"]["history_attribute_types"]["Row"];
type HistoryYearRow = Database["public"]["Tables"]["entity_history_years"]["Row"];

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();

  if (!trimmed) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    throw new Error("Respuesta vacía del servidor");
  }

  const head = trimmed.slice(0, 80).toLowerCase();
  if (head.startsWith("<!doctype") || head.startsWith("<html")) {
    throw new Error(
      "El servidor devolvió HTML en lugar de JSON (suele pasar con 404/500 de Next o un dev server desincronizado). Reiniciá `npm run dev` y recargá con forzar (Ctrl+F5)."
    );
  }

  let json: { data?: T; error?: string };
  try {
    json = JSON.parse(trimmed) as { data?: T; error?: string };
  } catch {
    throw new Error(
      "La respuesta no es JSON válido. Si acabás de cambiar rutas API, reiniciá el servidor de desarrollo."
    );
  }

  if (!res.ok) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  if (json.data === undefined) {
    throw new Error("Respuesta sin data");
  }
  return json.data;
}

export const archiveApi = {
  getTypes: () =>
    fetch("/api/types").then((r) => parseJson<EntityTypeWithAttributes[]>(r)),

  createType: (body: {
    label: string;
    color: string;
    slug: string;
    icon?: string;
  }) =>
    fetch("/api/types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityTypeWithAttributes>(r)),

  patchType: (
    id: string,
    body: {
      name?: string;
      color?: string;
      slug?: string;
      icon?: string;
      description?: string | null;
    }
  ) =>
    fetch(`/api/types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityTypeWithAttributes>(r)),

  deleteType: (id: string) =>
    fetch(`/api/types/${id}`, { method: "DELETE" }).then((r) =>
      parseJson<{ id: string }>(r)
    ),

  addAttribute: (
    typeId: string,
    body: {
      key: string;
      label: string;
      value_type: AttributeValueType;
      is_required?: boolean;
    }
  ) =>
    fetch(`/api/types/${typeId}/attributes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<AttributeRow>(r)),

  patchAttribute: (
    typeId: string,
    attributeId: string,
    body: {
      key?: string;
      label?: string;
      value_type?: AttributeValueType;
      is_required?: boolean;
      sort_order?: number;
    }
  ) =>
    fetch(`/api/types/${typeId}/attributes/${attributeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<AttributeRow>(r)),

  deleteAttribute: (typeId: string, attributeId: string) =>
    fetch(`/api/types/${typeId}/attributes/${attributeId}`, {
      method: "DELETE",
    }).then((r) => parseJson<{ id: string }>(r)),

  getEntities: () =>
    fetch("/api/entities").then((r) => parseJson<EntityWithTypeAndValues[]>(r)),

  createEntity: (body: {
    entity_type_id: string;
    name: string;
    slug?: string | null;
    summary?: string | null;
  }) =>
    fetch("/api/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityWithTypeAndValues>(r)),

  patchEntity: (
    id: string,
    body: {
      name?: string;
      slug?: string | null;
      summary?: string | null;
      meta?: Json;
      values?: Array<{
        attribute_id: string;
        value_text?: string | null;
        value_numeric?: number | string | null;
        value_boolean?: boolean | null;
        value_timestamptz?: string | null;
        value_json?: Json | null;
        ref_entity_id?: string | null;
      }>;
    }
  ) =>
    fetch(`/api/entities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityWithTypeAndValues>(r)),

  deleteEntity: (id: string) =>
    fetch(`/api/entities/${id}`, { method: "DELETE" }).then((r) =>
      parseJson<{ id: string }>(r)
    ),

  getRelationships: () =>
    fetch("/api/relationships").then((r) =>
      parseJson<RelationshipWithEntities[]>(r)
    ),

  getRelationshipsAtYear: (year: number) =>
    fetch(`/api/relationships?year=${encodeURIComponent(String(year))}`).then(
      (r) => parseJson<RelationshipWithEntities[]>(r)
    ),

  createRelationship: (body: {
    source_entity_id: string;
    target_entity_id: string;
    label: string;
    relation_key?: string;
    tension_level?: number;
    tension_notes?: string | null;
    year_start?: number | null;
    year_end?: number | null;
  }) =>
    fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<RelationshipWithEntities>(r)),

  patchRelationship: (
    id: string,
    body: {
      label?: string;
      relation_key?: string;
      tension_level?: number;
      tension_notes?: string | null;
      year_start?: number | null;
      year_end?: number | null;
    }
  ) =>
    fetch(`/api/relationships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<RelationshipWithEntities>(r)),

  deleteRelationship: (id: string) =>
    fetch(`/api/relationships/${id}`, { method: "DELETE" }).then((r) =>
      parseJson<{ id: string }>(r)
    ),

  getEntityHistory: (entityId: string) =>
    fetch(`/api/entities/${entityId}/history`).then((r) =>
      parseJson<EntityHistoryPayload>(r)
    ),

  getGlobalHistory: () =>
    fetch("/api/history/global").then((r) =>
      parseJson<GlobalHistoryPayload>(r)
    ),

  postHistoryYear: (entityId: string, body: { year: number }) =>
    fetch(`/api/entities/${entityId}/history/years`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<HistoryYearRow>(r)),

  deleteHistoryYear: (yearId: string) =>
    fetch(`/api/history/years/${yearId}`, { method: "DELETE" }).then((r) =>
      parseJson<{ id: string }>(r)
    ),

  getHistoryAttributes: (typeId: string) =>
    fetch(`/api/types/${typeId}/history-attributes`).then((r) =>
      parseJson<HistoryAttributeTypeRow[]>(r)
    ),

  postHistoryAttribute: (
    typeId: string,
    body: { key: string; label: string; value_type: HistoryAttributeValueType }
  ) =>
    fetch(`/api/types/${typeId}/history-attributes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<HistoryAttributeTypeRow>(r)),

  postHistoryYearValue: (
    yearId: string,
    body: { history_attribute_type_id: string }
  ) =>
    fetch(`/api/history/years/${yearId}/values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityHistoryValueWithType>(r)),

  patchHistoryValue: (
    valueId: string,
    body: {
      value_text?: string | null;
      value_number?: number | string | null;
      value_boolean?: boolean | null;
      value_date?: string | null;
    }
  ) =>
    fetch(`/api/history/values/${valueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityHistoryValueWithType>(r)),

  deleteHistoryValue: (valueId: string) =>
    fetch(`/api/history/values/${valueId}`, { method: "DELETE" }).then((r) =>
      parseJson<{ id: string }>(r)
    ),

  getEntityDocuments: (entityId: string) =>
    fetch(`/api/entities/${entityId}/documents`).then((r) =>
      parseJson<EntityDocument[]>(r)
    ),

  postEntityDocument: (
    entityId: string,
    body: { title: string; content?: string | null; classification?: string }
  ) =>
    fetch(`/api/entities/${entityId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityDocument>(r)),

  patchDocument: (
    id: string,
    body: {
      title?: string;
      content?: string | null;
      classification?: string;
    }
  ) =>
    fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityDocument>(r)),

  deleteDocument: (id: string) =>
    fetch(`/api/documents/${id}`, { method: "DELETE" }).then((r) =>
      parseJson<{ id: string }>(r)
    ),

  getEntityRumors: (entityId: string) =>
    fetch(`/api/entities/${entityId}/rumors`).then((r) =>
      parseJson<EntityRumorWithSource[]>(r)
    ),

  postEntityRumor: (
    entityId: string,
    body: {
      content: string;
      source_entity_id?: string | null;
      year?: number | null;
      credibility?: RumorCredibility;
    }
  ) =>
    fetch(`/api/entities/${entityId}/rumors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityRumorWithSource>(r)),

  patchRumor: (
    id: string,
    body: {
      content?: string;
      source_entity_id?: string | null;
      year?: number | null;
      credibility?: RumorCredibility;
    }
  ) =>
    fetch(`/api/rumors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityRumorWithSource>(r)),

  deleteRumor: (id: string) =>
    fetch(`/api/rumors/${id}`, { method: "DELETE" }).then((r) =>
      parseJson<{ id: string }>(r)
    ),

  getMapPositions: () =>
    fetch("/api/map/positions").then((r) =>
      parseJson<EntityMapPositionWithEntity[]>(r)
    ),

  getMapLocations: () =>
    fetch("/api/map/locations").then((r) => parseJson<MapLocationRow[]>(r)),

  getMapRegions: () =>
    fetch("/api/map/regions").then((r) => parseJson<MapRegionRow[]>(r)),

  postMapRegion: (body: {
    name: string;
    color: string;
    geojson: Record<string, unknown>;
  }) =>
    fetch("/api/map/regions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<MapRegionRow>(r)),

  patchMapRegion: (id: string, body: { name?: string; color?: string }) =>
    fetch(`/api/map/regions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<MapRegionRow>(r)),

  deleteMapRegion: (id: string) =>
    fetch(`/api/map/regions/${id}`, { method: "DELETE" }).then((r) =>
      parseJson<{ id: string }>(r)
    ),

  postMapPosition: (body: { entity_id: string; lat: number; lng: number }) =>
    fetch("/api/map/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityMapPositionWithEntity>(r)),

  patchMapPosition: (id: string, body: { lat: number; lng: number }) =>
    fetch(`/api/map/positions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<EntityMapPositionWithEntity>(r)),

  deleteMapPosition: (id: string) =>
    fetch(`/api/map/positions/${id}`, { method: "DELETE" }).then((r) =>
      parseJson<{ id: string }>(r)
    ),
};
