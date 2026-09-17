import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	MeetingNotFoundError,
	MinuteNotEditableError,
	MinuteTemplateNotFoundError,
} from "#/lib/minutes/errors";
import {
	getMinuteEditableContent,
	updateMinuteContent,
} from "#/lib/minutes/repository";
import { minuteContentSchema } from "#/lib/minutes/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/minutes/content",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: getMinuteContentHandler,
			PATCH: updateMinuteContentHandler,
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

export async function getMinuteContentHandler({
	request,
	context,
	params,
}: Ctx) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) return json({ error: "Não autenticado" }, 401);

	try {
		const content = await getMinuteEditableContent(
			createDb(requireD1(env)),
			params.meetingId,
		);
		return json(content, 200);
	} catch (error) {
		if (
			error instanceof MeetingNotFoundError ||
			error instanceof MinuteTemplateNotFoundError
		) {
			return json({ error: error.message }, 404);
		}
		throw error;
	}
}

export async function updateMinuteContentHandler({
	request,
	context,
	params,
}: Ctx) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) return json({ error: "Não autenticado" }, 401);

	const body = await request.json().catch(() => null);
	const parsed = minuteContentSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	try {
		const updated = await updateMinuteContent(
			createDb(requireD1(env)),
			params.meetingId,
			parsed.data,
		);
		return json(updated, 200);
	} catch (error) {
		if (
			error instanceof MeetingNotFoundError ||
			error instanceof MinuteTemplateNotFoundError
		) {
			return json({ error: error.message }, 404);
		}
		if (error instanceof MinuteNotEditableError) {
			return json({ error: error.message }, 409);
		}
		throw error;
	}
}
