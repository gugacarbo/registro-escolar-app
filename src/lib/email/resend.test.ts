import { beforeEach, describe, expect, it, vi } from "vitest";
import { getResendClient, sendInvitationEmail } from "./resend";

const mockSend = vi.fn();

vi.mock("resend", () => {
	return {
		Resend: class {
			emails = {
				send: mockSend,
			};
		},
	};
});

describe("resend email service", () => {
	beforeEach(() => {
		mockSend.mockReset();
	});

	it("obtém o cliente a partir de process.env.RESEND_API_KEY", () => {
		const originalEnv = process.env.RESEND_API_KEY;
		process.env.RESEND_API_KEY = "re_env_key_123";
		try {
			const client = getResendClient();
			expect(client).toBeDefined();
		} finally {
			if (originalEnv !== undefined) {
				process.env.RESEND_API_KEY = originalEnv;
			} else {
				delete process.env.RESEND_API_KEY;
			}
		}
	});

	it("lança erro se a chave da API não estiver disponível", () => {
		const originalEnv = process.env.RESEND_API_KEY;
		delete process.env.RESEND_API_KEY;

		expect(() => getResendClient()).toThrow("RESEND_API_KEY não configurada");

		if (originalEnv) {
			process.env.RESEND_API_KEY = originalEnv;
		}
	});

	it("envia e-mail com remetente padrão e dados corretos", async () => {
		mockSend.mockResolvedValue({ data: { id: "email-123" }, error: null });

		const result = await sendInvitationEmail({
			to: "destinatario@escola.test",
			inviterName: "Prof. Carlos",
			inviteUrl: "https://escola.test/register?token=tok-123",
			apiKey: "test-api-key",
		});

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				from: "Registro Escolar <onboarding@resend.dev>",
				to: "destinatario@escola.test",
				subject: "Convite para acessar o Registro Escolar",
				text: expect.stringContaining("Prof. Carlos"),
				html: expect.stringContaining(
					"https://escola.test/register?token=tok-123",
				),
			}),
		);
		expect(result).toEqual({ data: { id: "email-123" }, error: null });
	});

	it("permite customizar o remetente", async () => {
		mockSend.mockResolvedValue({ data: { id: "email-456" }, error: null });

		await sendInvitationEmail({
			to: "outro@escola.test",
			inviterName: "Admin",
			inviteUrl: "https://escola.test/register?token=tok-456",
			apiKey: "test-api-key",
			from: "custom@escola.test",
		});

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				from: "custom@escola.test",
			}),
		);
	});
});
