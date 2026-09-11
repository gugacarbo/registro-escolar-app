import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { parsePageParams } from "#/lib/pagination";
import {
	countStudents,
	createStudent,
	findStudentsByNameOrDocument,
	listStudents,
} from "#/lib/students/repository";
import { createStudentSchema } from "#/lib/students/schema";
import { normalizeDocument, normalizeName } from "#/lib/students/shared";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/students/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listStudentsHandler,
			POST: createStudentHandler,
		},
	},
});

export async function listStudentsHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return new Response(JSON.stringify({ error: "Não autenticado" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const url = new URL(request.url);
	const { page, pageSize, limit, offset, search } = parsePageParams(
		url.searchParams,
	);
	const rawClassId = url.searchParams.get("classId")?.trim();
	const classId = rawClassId ? rawClassId : undefined;

	const db = createDb(requireD1(env));
	const [students, total] = await Promise.all([
		listStudents(db, { search, classId, limit, offset }),
		countStudents(db, { search, classId }),
	]);
	return new Response(
		JSON.stringify({ data: students, total, page, pageSize }),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		},
	);
}

export async function createStudentHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
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

	const db = createDb(requireD1(env));
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
			JSON.stringify({
				error: "Estudante já existe",
				existingStudent: duplicate,
			}),
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
