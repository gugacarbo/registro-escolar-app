import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import {
	createStudent,
	findStudentsByNameOrDocument,
} from "#/lib/students/repository";
import { createStudentSchema } from "#/lib/students/schema";
import { normalizeDocument, normalizeName } from "#/lib/students/shared";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/students/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			POST: createStudentHandler,
		},
	},
});

export async function createStudentHandler({
	request,
	context,
}: {
	request: Request;
	context: { env: Env };
}) {
	const session = await getSession(request, context.env);
	if (!session) {
		return new Response(JSON.stringify({ error: "Não autenticado" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const body = await request.json();
	const parsed = createStudentSchema.safeParse(body);
	if (!parsed.success) {
		return new Response(
			JSON.stringify({ error: "Dados inválidos", issues: parsed.error.issues }),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	const db = createDb(context.env.DB);
	const normalizedName = normalizeName(parsed.data.name);
	const normalizedDocument = parsed.data.document
		? normalizeDocument(parsed.data.document)
		: undefined;

	const existing = await findStudentsByNameOrDocument(db, {
		name: normalizedName,
		document: normalizedDocument,
	});

	const duplicate = existing.find(
		(s) =>
			normalizeName(s.name) === normalizedName ||
			(parsed.data.document &&
				s.document &&
				normalizeDocument(s.document) === normalizedDocument),
	);

	if (duplicate) {
		return new Response(
			JSON.stringify({ error: "Aluno já existe", existingStudent: duplicate }),
			{
				status: 409,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	const student = await createStudent(db, parsed.data);
	return new Response(JSON.stringify(student), {
		status: 201,
		headers: { "Content-Type": "application/json" },
	});
}
