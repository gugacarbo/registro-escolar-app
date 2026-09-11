import { z } from "zod";

export const createInvitationSchema = z.object({
	email: z
		.string()
		.trim()
		.min(1, "Email obrigatório")
		.toLowerCase()
		.email("Email inválido"),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
