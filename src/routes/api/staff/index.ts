import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	createStaff,
	findStaffByName,
	listStaff,
} from "#/lib/staff/repository";
import { createStaffSchema } from "#/lib/staff/schema";
import { normalizeStaffName } from "#/lib/staff/shared";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/staff/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listStaffHandler,
			POST: createStaffHandler,
		},
	},
});

export async function listStaffHandler({
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
	const search = url.searchParams.get("search") ?? undefined;
	const limit = Number(url.searchParams.get("limit") ?? "50");
	const offset = Number(url.searchParams.get("offset") ?? "0");

	const db = createDb(requireD1(env));
	const staff = await listStaff(db, {
		search,
		limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 50,
		offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
	});
	return new Response(JSON.stringify(staff), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

export async function createStaffHandler({
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
	const parsed = createStaffSchema.safeParse(body);
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
	const normalizedName = normalizeStaffName(parsed.data.name);
	const existing = await findStaffByName(db, parsed.data.name);
	// Matching normalizado cobre caixa, acentos e espaços extras.
	if (existing.length === 0) {
		const activeStaff = await listStaff(db, { limit: 200 });
		existing.push(
			...activeStaff.filter(
				(s) => normalizeStaffName(s.name) === normalizedName,
			),
		);
	}
	const duplicate = existing.find(
		(s) => normalizeStaffName(s.name) === normalizedName,
	);

	if (duplicate) {
		return new Response(
			JSON.stringify({
				error: "Servidor já cadastrado",
				existingStaff: duplicate,
			}),
			{
				status: 409,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	const member = await createStaff(db, parsed.data);
	return new Response(JSON.stringify(member), {
		status: 201,
		headers: { "Content-Type": "application/json" },
	});
}
