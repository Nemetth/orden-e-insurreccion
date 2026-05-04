import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  badRequest,
  conflict,
  internalError,
  jsonCreated,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { Database } from "@/types/database";

type YearRow = Database["public"]["Tables"]["entity_history_years"]["Row"];

type PostBody = { year?: number };

function isValidYear(n: number): boolean {
  return Number.isInteger(n) && n >= -50_000 && n <= 50_000;
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id: entityId } = context.params;
    const body = await readJsonBody<PostBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const year =
      typeof body.year === "number"
        ? body.year
        : typeof body.year === "string"
          ? Number(body.year)
          : NaN;

    if (!Number.isFinite(year) || !isValidYear(year)) {
      return badRequest("year debe ser un entero razonable");
    }

    const supabase = await createClient();

    const { data: ent, error: e0 } = await table(supabase, "entities")
      .select("id")
      .eq("id", entityId)
      .maybeSingle();

    if (e0) return internalError(e0.message, { code: e0.code });
    if (!ent) return notFound("Entidad no encontrada");

    const insert: Database["public"]["Tables"]["entity_history_years"]["Insert"] =
      {
        entity_id: entityId,
        year,
      };

    const { data: row, error: insErr } = await table(
      supabase,
      "entity_history_years"
    )
      .insert(insert as never)
      .select("*")
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        return conflict("Ese año ya está registrado para esta entidad");
      }
      return internalError(insErr.message, { code: insErr.code });
    }

    return jsonCreated<YearRow>(row as YearRow);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
