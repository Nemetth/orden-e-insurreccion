import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  internalError,
  jsonOk,
  notFound,
} from "@/lib/api/http";

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const supabase = await createClient();

    const { data: existing, error: loadErr } = await table(
      supabase,
      "relationships"
    )
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      return internalError(loadErr.message, { code: loadErr.code });
    }
    if (!existing) return notFound("Relación no encontrada");

    const { error: delErr } = await table(supabase, "relationships")
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
