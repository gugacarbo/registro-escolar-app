import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { findStudentById, updateStudent } from "#/lib/students/repository";
import { updateStudentSchema } from "#/lib/students/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/students/$id/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: getStudentHandler,
			PATCH: updateStudentHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function getStudentHandler({
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

	const db = createDb(requireD1(env));
	const student = await findStudentById(db, params.id);
	if (!student) {
		return json({ error: "Estudante não encontrado" }, 404);
	}
	return json(student, 200);
}

export async function updateStudentHandler({
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

	const body = (await request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	if (!body) {
		return json({ error: "Dados inválidos" }, 400);
	}
	// Aceita data ISO (input date da UI) convertendo para Date.
	if (typeof body.birthDate === "string") {
		if (body.birthDate.length === 0) {
			delete body.birthDate;
		} else {
			body.birthDate = new Date(body.birthDate);
		}
	}
	const parsed = updateStudentSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const student = await findStudentById(db, params.id);
	if (!student) {
		return json({ error: "Estudante não encontrado" }, 404);
	}

	const updated = await updateStudent(db, params.id, parsed.data);
	return json(updated, 200);
}
