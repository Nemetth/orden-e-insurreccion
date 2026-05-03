import { entityTypeColorTaken } from "@/lib/api/type-color-conflict";
import {
  badRequest,
  conflict,
  internalError,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import type { EntityTypeWithAttributes } from "@/types/api";
import type { Database } from "@/types/database";
import { isValidEntityTypeIcon } from "@/lib/entity-type-icon-names";

type AttributeRow = Database["public"]["Tables"]["attributes"]["Row"];
type EntityTypeRow = Database["public"]["Tables"]["entity_types"]["Row"];

type PatchTypeBody = {
  name?: string;
  color?: string;
  slug?: string;
  icon?: string;
  description?: string | null;
};

async function loadTypePayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  typeId: string
): Promise<EntityTypeWithAttributes | null> {
  const { data: row, error } = await table(supabase, "entity_types")
    .select("*")
    .eq("id", typeId)
    .maybeSingle();

  if (error || !row) return null;

  const t = row as EntityTypeRow;

  const { data: attrs, error: aErr } = await table(supabase, "attributes")
    .select("*")
    .eq("entity_type_id", typeId)
    .order("sort_order", { ascending: true });

  if (aErr) return null;

  const attributes = ((attrs ?? []) as AttributeRow[]).sort(
    (x, y) =>
      x.sort_order - y.sort_order || x.key.localeCompare(y.key)
  );

  return { ...t, attributes };
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await readJsonBody<PatchTypeBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const supabase = await createClient();

    const { data: existing, error: loadErr } = await table(supabase, "entity_types")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      return internalError(loadErr.message, { code: loadErr.code });
    }
    if (!existing) return notFound("Tipo no encontrado");

    const update: Database["public"]["Tables"]["entity_types"]["Update"] = {};

    if (body.name !== undefined) {
      const n = typeof body.name === "string" ? body.name.trim() : "";
      if (!n) return badRequest("name no puede estar vacío");
      update.name = n;
    }

    if (body.slug !== undefined) {
      const s = typeof body.slug === "string" ? body.slug.trim() : "";
      if (!s) return badRequest("slug no puede estar vacío");
      update.slug = s;
    }

    if (body.color !== undefined) {
      const c = typeof body.color === "string" ? body.color.trim() : "";
      if (!c) return badRequest("color no puede estar vacío");
      const taken = await entityTypeColorTaken(supabase, c, id);
      if (taken) {
        return conflict("Ya existe otro tipo con ese color");
      }
      update.color = c;
    }

    if (body.icon !== undefined) {
      const ic = typeof body.icon === "string" ? body.icon.trim() : "";
      if (!ic) return badRequest("icon no puede estar vacío");
      if (!isValidEntityTypeIcon(ic)) {
        return badRequest("Ícono no permitido");
      }
      update.icon = ic;
    }

    if (body.description !== undefined) {
      update.description =
        body.description === null ? null : String(body.description).trim() || null;
    }

    if (Object.keys(update).length === 0) {
      const payload = await loadTypePayload(supabase, id);
      if (!payload) return internalError("No se pudo cargar el tipo");
      return jsonOk(payload);
    }

    const { error: upErr } = await table(supabase, "entity_types")
      .update(update as never)
      .eq("id", id);

    if (upErr) {
      if (upErr.code === "23505") {
        return conflict("Ya existe un tipo con ese slug");
      }
      return internalError(upErr.message, { code: upErr.code });
    }

    const payload = await loadTypePayload(supabase, id);
    if (!payload) return internalError("No se pudo cargar el tipo actualizado");

    return jsonOk(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const supabase = await createClient();

    const { data: typeRow, error: loadErr } = await table(supabase, "entity_types")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      return internalError(loadErr.message, { code: loadErr.code });
    }
    if (!typeRow) return notFound("Tipo no encontrado");

    const { count, error: cntErr } = await table(supabase, "entities")
      .select("id", { count: "exact", head: true })
      .eq("entity_type_id", id);

    if (cntErr) {
      return internalError(cntErr.message, { code: cntErr.code });
    }
    if ((count ?? 0) > 0) {
      return conflict(
        "No se puede eliminar el tipo mientras existan entidades de esa clase. Eliminá o reasigná las entidades antes."
      );
    }

    const { error: delErr } = await table(supabase, "entity_types")
      .delete()
      .eq("id", id);

    if (delErr) {
      return internalError(delErr.message, { code: delErr.code });
    }

    return jsonOk({ id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
