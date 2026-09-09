import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { createStudent } from "#/lib/students/repository";
import { d1Middleware } from "#/middleware/d1";

const VALID_ACTIONS = ["create", "link", "skip"] as const;
type Action = (typeof VALID_ACTIONS)[number];

type ResolutionRow = {
	index: number;
	action: Action;
	data?: {
		name: string;
		document?: string;
		registrationNumber?: string;
		email?: string;
		phone?: string;
		birthDate?: string;
		notes?: string;
	};
	existingStudentId?: string;
};

export const Route = createFileRoute("/api/students/import/resolve")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			POST: importResolveHandler,
		},
	},
});

export async function importResolveHandler({
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

	const body = (await request.json()) as { rows: ResolutionRow[] };
	const resolutions = body.rows;
	if (!Array.isArray(resolutions)) {
		return new Response(JSON.stringify({ error: "Resoluções inválidas" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	for (const resolution of resolutions) {
		if (!VALID_ACTIONS.includes(resolution.action)) {
			return new Response(
				JSON.stringify({ error: `Ação inválida: ${resolution.action}` }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}
		if (resolution.action === "link" && !resolution.existingStudentId) {
			return new Response(
				JSON.stringify({ error: "Vínculo requer existingStudentId" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}
		if (resolution.action === "create" && !resolution.data?.name) {
			return new Response(JSON.stringify({ error: "Criação requer nome" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}
	}

	const db = createDb(context.env.DB);

	let created = 0;
	let linked = 0;
	let skipped = 0;
	const students: Array<{ id: string; name: string }> = [];

	for (const resolution of resolutions) {
		if (resolution.action === "skip") {
			skipped++;
			continue;
		}

		if (resolution.action === "link") {
			linked++;
			students.push({
				id: resolution.existingStudentId as string,
				name: resolution.data?.name ?? "",
			});
			continue;
		}

		const input = resolution.data as ResolutionRow["data"];
		const student = await createStudent(db, {
			name: input?.name ?? "",
			document: input?.document,
			registrationNumber: input?.registrationNumber,
			email: input?.email,
			phone: input?.phone,
			birthDate: input?.birthDate ? new Date(input.birthDate) : undefined,
			notes: input?.notes,
		});
		created++;
		students.push({ id: student.id, name: student.name });
	}

	return new Response(JSON.stringify({ created, linked, skipped, students }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
