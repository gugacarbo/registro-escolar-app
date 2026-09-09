import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	MeetingNotFoundError,
	MinuteAlreadyApprovedError,
	MinuteNotFoundError,
	NoCurrentVersionError,
} from "#/lib/minutes/errors";
import { approveMinute } from "#/lib/minutes/repository";
import { approveMinuteSchema } from "#/lib/minutes/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/minutes/approve",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			PATCH: approveMinuteHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function approveMinuteHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { meetingId: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}
	const body = (await request.json().catch(() => null)) as unknown;
	const parsed = approveMinuteSchema.safeParse(body ?? {});
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}
	const db = createDb(requireD1(env));
	try {
		const minute = await approveMinute(db, params.meetingId, {
			data: parsed.data.data,
			observacao: parsed.data.observacao ?? null,
		});
		return json(
			{
				id: minute.id,
				meetingId: minute.meetingId,
				approvalStatus: minute.approvalStatus,
				approvedAt: minute.approvedAt?.toISOString() ?? null,
				approvalNotes: minute.approvalNotes,
			},
			200,
		);
	} catch (error) {
		if (
			error instanceof MinuteNotFoundError ||
			error instanceof MeetingNotFoundError
		) {
			return json({ error: error.message }, 404);
		}
		if (
			error instanceof NoCurrentVersionError ||
			error instanceof MinuteAlreadyApprovedError
		) {
			return json({ error: error.message }, 409);
		}
		throw error;
	}
}
