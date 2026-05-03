import type {
  EntityTypeWithAttributes,
  EntityWithTypeAndValues,
  RelationshipWithEntities,
} from "@/types/api";
import type { AttributeValueType, Database, Json } from "@/types/database";

type AttributeRow = Database["public"]["Tables"]["attributes"]["Row"];

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as { data?: T; error?: string };
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

  createRelationship: (body: {
    source_entity_id: string;
    target_entity_id: string;
    label: string;
    relation_key?: string;
  }) =>
    fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => parseJson<RelationshipWithEntities>(r)),

  patchRelationship: (
    id: string,
    body: { label?: string; relation_key?: string }
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
};
