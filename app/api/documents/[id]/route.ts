import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  badRequest,
  internalError,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { EntityDocument } from "@/types/api";
import type { Database } from "@/types/database";

type DocRow = Database["public"]["Tables"]["entity_documents"]["Row"];

type PatchBody = {
  title?: string;
  content?: string | null;
  classification?: string;
};

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await readJsonBody<PatchBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const supabase = await createClient();

    const { data: existing, error: loadErr } = await table(
      supabase,
      "entity_documents"
    )
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) return internalError(loadErr.message, { code: loadErr.code });
    if (!existing) return notFound("Documento no encontrado");

    const update: Database["public"]["Tables"]["entity_documents"]["Update"] = {};

    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t) return badRequest("title no puede estar vacío");
      update.title = t;
    }
    if (body.content !== undefined) {
      update.content =
        body.content === null ? null : String(body.content);
    }
    if (body.classification !== undefined) {
      const c = String(body.classification).trim();
      if (!c) return badRequest("classification no puede estar vacío");
      update.classification = c;
    }

    if (Object.keys(update).length === 0) {
      return jsonOk<EntityDocument>(existing as DocRow);
    }

    const { error: upErr } = await table(supabase, "entity_documents")
      .update(update as never)
      .eq("id", id);

    if (upErr) return internalError(upErr.message, { code: upErr.code });

    const { data: row, error: rErr } = await table(supabase, "entity_documents")
      .select("*")
      .eq("id", id)
      .single();

    if (rErr || !row) return internalError(rErr?.message ?? "No se pudo recargar");

    return jsonOk<EntityDocument>(row as DocRow);
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

    const { data: existing, error: loadErr } = await table(
      supabase,
      "entity_documents"
    )
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) return internalError(loadErr.message, { code: loadErr.code });
    if (!existing) return notFound("Documento no encontrado");

    const { error: delErr } = await table(supabase, "entity_documents")
      .delete()
      .eq("id", id);

    if (delErr) return internalError(delErr.message, { code: delErr.code });

    return jsonOk({ id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
