import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	MeetingClosedError,
	MeetingNotClosedError,
	MeetingNotFoundError,
	MinuteAlreadyApprovedError,
	MinuteNotFoundError,
	MinuteVersionNotFoundError,
	NoCurrentVersionError,
} from "#/lib/minutes/errors";
import {
	approveMinute,
	findMinuteVersionPdf,
	generateMinuteVersion,
	listMinuteVersions,
	previewMinute,
} from "#/lib/minutes/repository";
import {
	approveMinuteSchema,
	generateMinuteSchema,
} from "#/lib/minutes/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/meetings/$meetingId/minutes/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: previewHandler,
			POST: generateHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

type Ctx = {
	request: Request;
	context: { env?: Env };
	params: { meetingId: string };
};

/** GET ?action=preview (prévia da ata, spec 0009). */
export async function previewHandler({ request, context, params }: Ctx) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}
	const db = createDb(requireD1(env));
	try {
		const preview = await previewMinute(db, params.meetingId);
		return json(preview, 200);
	} catch (error) {
		if (error instanceof MeetingNotFoundError) {
			return json({ error: error.message }, 404);
		}
		throw error;
	}
}

/** POST — gera versão oficial com PDF (spec 0009/0010). */
export async function generateHandler({ request, context, params }: Ctx) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}
	const body = (await request.json().catch(() => null)) as unknown;
	const parsed = generateMinuteSchema.safeParse(body ?? {});
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}
	const db = createDb(requireD1(env));
	try {
		const { minute, version } = await generateMinuteVersion(
			db,
			params.meetingId,
			{ notes: parsed.data.observacao ?? null },
		);
		return json(
			{
				minuteId: minute.id,
				version: version.version,
				isCurrent: version.isCurrent,
				createdAt: version.createdAt.toISOString(),
				approvalStatus: minute.approvalStatus,
				pdfSize: Buffer.isBuffer(version.pdf) ? version.pdf.length : 0,
			},
			201,
		);
	} catch (error) {
		if (error instanceof MeetingNotFoundError) {
			return json({ error: error.message }, 404);
		}
		if (error instanceof MeetingClosedError) {
			return json({ error: error.message }, 409);
		}
		throw error;
	}
}

/** Rotas auxiliares exportadas para arquivos de rota dedicados. */
export async function versionsHandler({ request, context, params }: Ctx) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}
	const db = createDb(requireD1(env));
	try {
		return json(await listMinuteVersions(db, params.meetingId), 200);
	} catch (error) {
		if (error instanceof MinuteNotFoundError) {
			return json({ error: error.message }, 404);
		}
		throw error;
	}
}

export async function versionPdfHandler({
	request,
	context,
	params,
}: Ctx & { params: { meetingId: string; version: string } }) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}
	const version = Number.parseInt(params.version, 10);
	if (!Number.isFinite(version)) {
		return json({ error: "Versão inválida" }, 400);
	}
	const db = createDb(requireD1(env));
	try {
		const pdf = await findMinuteVersionPdf(db, params.meetingId, version);
		return new Response(new Uint8Array(pdf), {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `inline; filename="ata-v${version}.pdf"`,
			},
		});
	} catch (error) {
		if (
			error instanceof MinuteNotFoundError ||
			error instanceof MinuteVersionNotFoundError
		) {
			return json({ error: error.message }, 404);
		}
		throw error;
	}
}

export async function approveHandler({ request, context, params }: Ctx) {
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
		if (error instanceof MinuteNotFoundError) {
			return json({ error: error.message }, 404);
		}
		if (
			error instanceof NoCurrentVersionError ||
			error instanceof MinuteAlreadyApprovedError ||
			error instanceof MeetingNotClosedError
		) {
			return json({ error: error.message }, 409);
		}
		throw error;
	}
}
