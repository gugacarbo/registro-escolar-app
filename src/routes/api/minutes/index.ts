import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { countMinutes, listMinutes } from "#/lib/minutes/repository";
import { minuteApprovalStatusSchema } from "#/lib/minutes/schema";
import { parsePageParams } from "#/lib/pagination";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/minutes/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listMinutesHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

/** GET — lista todas as atas com busca por reunião, filtro de aprovação e paginação. */
export async function listMinutesHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const url = new URL(request.url);
	const { page, pageSize, limit, offset, search } = parsePageParams(
		url.searchParams,
	);
	const statusParam = url.searchParams.get("approvalStatus");
	const approvalStatus = statusParam
		? minuteApprovalStatusSchema.safeParse(statusParam).success
			? (statusParam as "pendente_aprovacao" | "aprovada")
			: undefined
		: undefined;

	const db = createDb(requireD1(env));
	const [data, total] = await Promise.all([
		listMinutes(db, { search, approvalStatus, limit, offset }),
		countMinutes(db, { search, approvalStatus }),
	]);
	return json({ data, total, page, pageSize }, 200);
}
