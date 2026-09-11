import { z } from "zod";

export const createInvitationSchema = z.object({
	email: z
		.string({ required_error: "Email obrigatório" })
		.trim()
		.toLowerCase()
		.email("Email inválido"),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
