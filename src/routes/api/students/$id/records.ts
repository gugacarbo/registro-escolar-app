import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	ERR_STUDENT_NOT_FOUND,
	RecordNotFoundError,
} from "#/lib/records/errors";
import { createIndependentRecord } from "#/lib/records/repository";
import { createIndependentRecordSchema } from "#/lib/records/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/students/$id/records")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			POST: createIndependentRecordHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function createIndependentRecordHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { id: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const body = (await request.json().catch(() => null)) as unknown;
	const parsed = createIndependentRecordSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	try {
		const record = await createIndependentRecord(db, {
			studentId: params.id,
			texto: parsed.data.texto,
			turmaId: parsed.data.turmaId ?? null,
			categoriaId: parsed.data.categoriaId ?? null,
			componenteId: parsed.data.componenteId ?? null,
			incluirNaAta: parsed.data.incluirNaAta ?? true,
		});
		return json(record, 201);
	} catch (error) {
		if (
			error instanceof RecordNotFoundError &&
			error.message === ERR_STUDENT_NOT_FOUND
		) {
			return json({ error: ERR_STUDENT_NOT_FOUND }, 404);
		}
		throw error;
	}
}
