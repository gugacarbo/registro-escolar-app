import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	createGeneralReport,
	listGeneralReportsByMeeting,
} from "#/lib/general-reports/repository";
import { createGeneralReportSchema } from "#/lib/general-reports/schema";
import { serializeGeneralReport } from "#/lib/general-reports/types";
import { findMeetingById } from "#/lib/meetings/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/general-reports/",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listGeneralReportsHandler,
			POST: createGeneralReportHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function listGeneralReportsHandler({
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

	const db = createDb(requireD1(env));
	const meeting = await findMeetingById(db, params.meetingId);
	if (!meeting) {
		return json({ error: "Reunião não encontrada" }, 404);
	}

	const reports = await listGeneralReportsByMeeting(db, params.meetingId);
	return json(reports.map(serializeGeneralReport), 200);
}

export async function createGeneralReportHandler({
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

	const body = (await request.json().catch(() => null)) as {
		texto?: unknown;
		categoriaId?: unknown;
		origemId?: unknown;
		incluirNaAta?: unknown;
	} | null;
	const parsed = createGeneralReportSchema.safeParse({
		texto: body?.texto,
		categoryId: body?.categoriaId ?? null,
		originId: body?.origemId ?? null,
		includeInMinutes: body?.incluirNaAta ?? true,
		meetingId: params.meetingId,
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
	if (meeting.status !== "open") {
		return json(
			{
				error: "Reunião encerrada: reabra para criar/editar relatos gerais",
				meetingStatus: meeting.status,
			},
			409,
		);
	}

	try {
		const report = await createGeneralReport(db, {
			...parsed.data,
			meetingId: params.meetingId,
		});
		return json(serializeGeneralReport(report), 201);
	} catch (error) {
		if (
			error instanceof Error &&
			error.message ===
				"A origem deve ser um participante desta reunião (CA-005)"
		) {
			return json({ error: error.message }, 422);
		}
		throw error;
	}
}
