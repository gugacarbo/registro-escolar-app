import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	createStudent,
	findStudentById,
	findStudentsByNameOrDocument,
} from "#/lib/students/repository";
import { createStudentSchema } from "#/lib/students/schema";
import { normalizeDocument, normalizeName } from "#/lib/students/shared";
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

function badRequest(message: string) {
	return new Response(JSON.stringify({ error: message }), {
		status: 400,
		headers: { "Content-Type": "application/json" },
	});
}

type CreateInput = {
	name: string;
	document?: string;
	registrationNumber?: string;
	email?: string;
	phone?: string;
	birthDate?: Date;
	notes?: string;
};

type NormalizeResult = { input: CreateInput } | { error: string };

function normalizeCreateData(
	data: NonNullable<ResolutionRow["data"]>,
): NormalizeResult {
	const trimmed: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (typeof value !== "string") continue;
		const text = value.trim();
		if (text !== "") {
			trimmed[key] = text;
		}
	}
	if (trimmed.birthDate !== undefined) {
		const date = new Date(trimmed.birthDate as string);
		if (Number.isNaN(date.getTime())) {
			return { error: "Data de nascimento inválida" };
		}
		trimmed.birthDate = date;
	}
	const parsed = createStudentSchema.safeParse(trimmed);
	if (!parsed.success) {
		const first = parsed.error.issues[0];
		return {
			error: `Linha inválida: ${first.path.join(".") || "dados"} — ${first.message}`,
		};
	}
	return { input: parsed.data as CreateInput };
}

export async function importResolveHandler({
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

	const body = (await request.json()) as { rows: ResolutionRow[] };
	const resolutions = body.rows;
	if (!Array.isArray(resolutions)) {
		return badRequest("Resoluções inválidas");
	}

	for (const resolution of resolutions) {
		if (!VALID_ACTIONS.includes(resolution.action)) {
			return badRequest(`Ação inválida: ${resolution.action}`);
		}
		if (resolution.action === "link" && !resolution.existingStudentId) {
			return badRequest("Vínculo requer existingStudentId");
		}
		if (resolution.action === "create") {
			if (!resolution.data?.name?.trim()) {
				return badRequest("Criação requer nome");
			}
			const normalized = normalizeCreateData(resolution.data);
			if ("error" in normalized) {
				return badRequest(normalized.error);
			}
		}
	}

	const db = createDb(requireD1(env));

	let created = 0;
	let linked = 0;
	let skipped = 0;
	const students: Array<{ id: string; name: string }> = [];
	const createdInBatch: Array<{ name: string; document?: string }> = [];

	for (const resolution of resolutions) {
		if (resolution.action === "skip") {
			skipped++;
			continue;
		}

		if (resolution.action === "link") {
			const existing = await findStudentById(
				db,
				resolution.existingStudentId as string,
			);
			if (!existing) {
				return badRequest(
					`Estudante existente não encontrado: ${resolution.existingStudentId}`,
				);
			}
			linked++;
			students.push({ id: existing.id, name: existing.name });
			continue;
		}

		const normalized = normalizeCreateData(
			resolution.data as NonNullable<ResolutionRow["data"]>,
		);
		if ("error" in normalized) {
			return badRequest(normalized.error);
		}
		const input = normalized.input;
		const normalizedName = normalizeName(input.name);
		const normalizedDocument = input.document
			? normalizeDocument(input.document)
			: undefined;

		const matchesSelfInBatch = createdInBatch.some(
			(entry) =>
				entry.name === normalizedName ||
				(normalizedDocument &&
					entry.document &&
					entry.document === normalizedDocument),
		);
		const existing = await findStudentsByNameOrDocument(db, {
			name: input.name,
			document: input.document,
		});
		const duplicate = existing.find(
			(s) =>
				normalizeName(s.name) === normalizedName ||
				(normalizedDocument &&
					s.document &&
					normalizeDocument(s.document) === normalizedDocument),
		);
		if (matchesSelfInBatch || duplicate) {
			return badRequest(
				`Estudante já existe: ${input.name}. Resolva como vínculo ou ignore a linha.`,
			);
		}

		const student = await createStudent(db, input);
		createdInBatch.push({ name: normalizedName, document: normalizedDocument });
		created++;
		students.push({ id: student.id, name: student.name });
	}

	return new Response(JSON.stringify({ created, linked, skipped, students }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
