import { createFileRoute } from "@tanstack/react-router";

import { d1Middleware } from "#/middleware/d1";

// Handler canônico em ./index.ts (mesmo módulo do POST de geração da ata).
// Mantido como re-export para não duplicar tratamento de erros.
import { approveHandler } from "./index";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/minutes/approve",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			PATCH: approveHandler,
		},
	},
});
