import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  badRequest,
  conflict,
  internalError,
  jsonCreated,
  jsonOk,
  readJsonBody,
} from "@/lib/api/http";
import type { EntityTypeWithAttributes } from "@/types/api";
import type { Database } from "@/types/database";

type AttributeRow = Database["public"]["Tables"]["attributes"]["Row"];
type EntityTypeRow = Database["public"]["Tables"]["entity_types"]["Row"];

type PostTypesBody = {
  label?: string;
  color?: string;
  slug?: string;
};

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: types, error: typesError } = await table(supabase, "entity_types")
      .select("*")
      .order("name", { ascending: true });

    if (typesError) {
      return internalError(typesError.message, { code: typesError.code });
    }

    const typeRows = (types ?? []) as EntityTypeRow[];
    const typeIds = typeRows.map((t) => t.id);
    let attributes: AttributeRow[] = [];

    if (typeIds.length > 0) {
      const { data: attrs, error: attrError } = await table(supabase, "attributes")
        .select("*")
        .in("entity_type_id", typeIds);

      if (attrError) {
        return internalError(attrError.message, { code: attrError.code });
      }
      attributes = (attrs ?? []) as AttributeRow[];
    }

    const byType = new Map<string, AttributeRow[]>();
    for (const a of attributes) {
      const list = byType.get(a.entity_type_id) ?? [];
      list.push(a);
      byType.set(a.entity_type_id, list);
    }
    Array.from(byType.values()).forEach((list) => {
      list.sort((x, y) => x.sort_order - y.sort_order || x.key.localeCompare(y.key));
    });

    const data: EntityTypeWithAttributes[] = typeRows.map((t) => ({
      ...t,
      attributes: byType.get(t.id) ?? [],
    }));

    return jsonOk(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<PostTypesBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const label = typeof body.label === "string" ? body.label.trim() : "";
    const color = typeof body.color === "string" ? body.color.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";

    if (!label) return badRequest("label es obligatorio");
    if (!color) return badRequest("color es obligatorio");
    if (!slug) return badRequest("slug es obligatorio");

    const supabase = await createClient();

    const insertType: Database["public"]["Tables"]["entity_types"]["Insert"] = {
      name: label,
      slug,
      color,
    };

    const { data, error } = await table(supabase, "entity_types")
      .insert(insertType as never)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return conflict("Ya existe un tipo con ese slug", { code: error.code });
      }
      return internalError(error.message, { code: error.code });
    }

    const payload: EntityTypeWithAttributes = {
      ...(data as EntityTypeRow),
      attributes: [],
    };
    return jsonCreated(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
