import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { parseStudentImportFile } from "#/lib/students/csv-parser";
import { matchImportRows } from "#/lib/students/matching";
import { listStudents } from "#/lib/students/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/students/import")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			POST: importPreviewHandler,
		},
	},
});

export async function importPreviewHandler({
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

	const formData = await request.formData();
	const file = formData.get("file");
	if (!(file instanceof File)) {
		return new Response(JSON.stringify({ error: "Arquivo não enviado" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const { rows, errors: parserErrors } = await parseStudentImportFile(file);
	if (parserErrors.length > 0) {
		return new Response(
			JSON.stringify({
				error: "Falha ao processar arquivo",
				errors: parserErrors,
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	const db = createDb(context.env.DB);
	const existing = await listStudents(db, { limit: 1000 });
	const matched = matchImportRows(rows, existing);

	const summary = {
		total: matched.length,
		valid: matched.filter((r) => r.status === "valid").length,
		conflicts: matched.filter((r) => r.status === "conflict").length,
		invalid: matched.filter((r) => r.status === "invalid").length,
	};

	const responseRows = matched.map((row) => ({
		index: row.index,
		name: row.name,
		document: row.document ?? "",
		registrationNumber: row.registrationNumber ?? "",
		email: row.email ?? "",
		phone: row.phone ?? "",
		birthDate: row.birthDate ?? "",
		notes: row.notes ?? "",
		status: row.status,
		existingStudentId: row.candidates?.[0]?.student.id,
		existingStudentName: row.candidates?.[0]?.student.name,
		errors: row.errors,
		candidates: row.candidates?.map((c) => ({
			id: c.student.id,
			name: c.student.name,
			reason: c.reason,
		})),
	}));

	return new Response(JSON.stringify({ rows: responseRows, summary }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
