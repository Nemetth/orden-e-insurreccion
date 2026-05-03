import { NextResponse } from "next/server";

export type ApiSuccessBody<T> = { data: T };

export type ApiErrorBody = {
  error: string;
  details?: unknown;
};

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function jsonCreated<T>(data: T): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ data }, { status: 201 });
}

export function jsonError(
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

export function badRequest(message: string, details?: unknown) {
  return jsonError(message, 400, details);
}

export function notFound(message = "No encontrado") {
  return jsonError(message, 404);
}

export function conflict(message: string, details?: unknown) {
  return jsonError(message, 409, details);
}

export function internalError(message = "Error interno del servidor", details?: unknown) {
  return jsonError(message, 500, details);
}

export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
