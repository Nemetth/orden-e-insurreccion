import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  badRequest,
  internalError,
  jsonCreated,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { EntityDocument } from "@/types/api";
import type { Database } from "@/types/database";

type DocRow = Database["public"]["Tables"]["entity_documents"]["Row"];

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id: entityId } = context.params;
    const supabase = await createClient();

    const { data: ent, error: e0 } = await table(supabase, "entities")
      .select("id")
      .eq("id", entityId)
      .maybeSingle();

    if (e0) return internalError(e0.message, { code: e0.code });
    if (!ent) return notFound("Entidad no encontrada");

    const { data: rows, error } = await table(supabase, "entity_documents")
      .select("*")
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });

    if (error) return internalError(error.message, { code: error.code });

    return jsonOk<EntityDocument[]>((rows ?? []) as DocRow[]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}

type PostBody = {
  title?: string;
  content?: string | null;
  classification?: string;
};

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id: entityId } = context.params;
    const body = await readJsonBody<PostBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return badRequest("title es obligatorio");

    const supabase = await createClient();

    const { data: ent, error: e0 } = await table(supabase, "entities")
      .select("id")
      .eq("id", entityId)
      .maybeSingle();

    if (e0) return internalError(e0.message, { code: e0.code });
    if (!ent) return badRequest("entity_id no existe");

    const classification =
      typeof body.classification === "string" && body.classification.trim()
        ? body.classification.trim()
        : "CLASIFICADO";

    const insert: Database["public"]["Tables"]["entity_documents"]["Insert"] = {
      entity_id: entityId,
      title,
      content:
        body.content === undefined || body.content === null
          ? null
          : String(body.content),
      classification,
    };

    const { data: row, error } = await table(supabase, "entity_documents")
      .insert(insert as never)
      .select("*")
      .single();

    if (error) return internalError(error.message, { code: error.code });

    return jsonCreated<EntityDocument>(row as DocRow);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
