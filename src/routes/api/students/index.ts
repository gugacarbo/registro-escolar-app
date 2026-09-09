import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
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
	const rawSearch = url.searchParams.get("search")?.trim();
	const search = rawSearch ? rawSearch : undefined;

	const rawPage = Number(url.searchParams.get("page"));
	const rawPageSize = Number(url.searchParams.get("pageSize"));
	const rawLimit = Number(url.searchParams.get("limit"));
	const rawOffset = Number(url.searchParams.get("offset"));

	let page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
	let pageSize =
		Number.isFinite(rawPageSize) && rawPageSize >= 1
			? Math.min(Math.floor(rawPageSize), 100)
			: 10;
	if (!url.searchParams.has("page") && !url.searchParams.has("pageSize")) {
		const limit =
			Number.isFinite(rawLimit) && rawLimit > 0
				? Math.min(Math.floor(rawLimit), 200)
				: 10;
		const offset =
			Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
		page = Math.floor(offset / limit) + 1;
		pageSize = limit;
	}

	const db = createDb(requireD1(env));
	const [students, total] = await Promise.all([
		listStudents(db, {
			search,
			limit: pageSize,
			offset: (page - 1) * pageSize,
		}),
		countStudents(db, { search }),
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
