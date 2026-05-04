import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import { internalError, jsonOk, notFound } from "@/lib/api/http";

export async function DELETE(
  _request: Request,
  context: { params: { yearId: string } }
) {
  try {
    const { yearId } = context.params;
    const supabase = await createClient();

    const { data: existing, error: loadErr } = await table(
      supabase,
      "entity_history_years"
    )
      .select("id")
      .eq("id", yearId)
      .maybeSingle();

    if (loadErr) return internalError(loadErr.message, { code: loadErr.code });
    if (!existing) return notFound("Año histórico no encontrado");

    const { error: delErr } = await table(supabase, "entity_history_years")
      .delete()
      .eq("id", yearId);

    if (delErr) return internalError(delErr.message, { code: delErr.code });

    return jsonOk({ id: yearId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
