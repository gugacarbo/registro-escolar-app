import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	MeetingNotFoundError,
	MinuteNotFoundError,
	MinuteVersionNotFoundError,
	PdfNotAvailableError,
} from "#/lib/minutes/errors";
import { findMinuteVersionPdf } from "#/lib/minutes/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/minutes/versions/$version/pdf",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: versionPdfHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function versionPdfHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { meetingId: string; version: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}
	const version = Number.parseInt(params.version, 10);
	if (!Number.isInteger(version) || version <= 0) {
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
			error instanceof MeetingNotFoundError ||
			error instanceof MinuteVersionNotFoundError
		) {
			return json({ error: error.message }, 404);
		}
		if (error instanceof PdfNotAvailableError) {
			return json({ error: error.message }, 409);
		}
		throw error;
	}
}
