import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	InvalidOriginError,
	MeetingNotInProgressError,
	ReportNotFoundError,
} from "#/lib/general-reports/errors";
import { updateGeneralReport } from "#/lib/general-reports/repository";
import { updateGeneralReportSchema } from "#/lib/general-reports/schema";
import { serializeGeneralReport } from "#/lib/general-reports/types";
import { findMeetingById } from "#/lib/meetings/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/general-reports/$reportId",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			PATCH: updateGeneralReportHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function updateGeneralReportHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { meetingId: string; reportId: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const body = (await request.json().catch(() => null)) as {
		texto?: unknown;
		categoriaId?: unknown;
		origemId?: unknown;
		incluirNaAta?: unknown;
	} | null;
	const parsed = updateGeneralReportSchema.safeParse({
		texto: body?.texto,
		categoryId: body?.categoriaId ?? null,
		originId: body?.origemId ?? null,
		includeInMinutes: body?.incluirNaAta ?? true,
	});
	if (!parsed.success || !parsed.data.texto) {
		return json(
			{
				error: "Dados inválidos",
				issues: parsed.success ? [] : parsed.error.issues,
			},
			400,
		);
	}

	const db = createDb(requireD1(env));
	const meeting = await findMeetingById(db, params.meetingId);
	if (!meeting) {
		return json({ error: "Reunião não encontrada" }, 404);
	}

	try {
		const report = await updateGeneralReport(
			db,
			params.meetingId,
			params.reportId,
			{
				...parsed.data,
			},
		);
		return json(serializeGeneralReport(report), 200);
	} catch (error) {
		if (error instanceof ReportNotFoundError) {
			return json({ error: error.message }, 404);
		}
		if (error instanceof MeetingNotInProgressError) {
			return json({ error: error.message, meetingStatus: meeting.status }, 409);
		}
		if (error instanceof InvalidOriginError) {
			return json({ error: error.message }, 422);
		}
		throw error;
	}
}
