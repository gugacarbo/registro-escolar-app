import { Resend } from "resend";

export interface SendInvitationEmailParams {
	to: string;
	inviterName: string;
	inviteUrl: string;
	apiKey?: string;
	from?: string;
}

export function getResendClient(apiKey?: string): Resend {
	const key =
		apiKey ??
		(typeof process !== "undefined" ? process.env.RESEND_API_KEY : undefined);
	if (!key) {
		throw new Error("RESEND_API_KEY não configurada");
	}
	return new Resend(key);
}

export async function sendInvitationEmail({
	to,
	inviterName,
	inviteUrl,
	apiKey,
	from = "Registro Escolar <onboarding@resend.dev>",
}: SendInvitationEmailParams) {
	const resend = getResendClient(apiKey);

	const subject = "Convite para acessar o Registro Escolar";
	const text = `Olá!\n\nVocê foi convidado por ${inviterName} para acessar o Registro Escolar.\n\nEste convite é válido por 7 dias.\n\nPara criar sua conta e acessar a plataforma, clique no link abaixo:\n${inviteUrl}\n\nSe você não esperava este convite, pode ignorar esta mensagem.`;

	const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f9fafb; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="margin-top: 0; color: #0f172a; font-size: 22px;">Convite para o Registro Escolar</h2>
    <p style="font-size: 15px; color: #374151;">Olá,</p>
    <p style="font-size: 15px; color: #374151;">
      <strong>${inviterName}</strong> convidou você para fazer parte do <strong>Registro Escolar</strong>.
    </p>
    <p style="font-size: 14px; color: #6b7280;">
      Este convite tem validade de <strong>7 dias</strong>.
    </p>
    <div style="margin: 28px 0; text-align: center;">
      <a href="${inviteUrl}" style="background-color: #1e293b; color: #ffffff; padding: 12px 24px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 15px;">
        Aceitar Convite e Criar Conta
      </a>
    </div>
    <p style="font-size: 13px; color: #6b7280; word-break: break-all;">
      Ou copie e cole o link no seu navegador:<br>
      <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
    </p>
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0;">
      Se você não esperava este convite, pode desconsiderar esta mensagem.
    </p>
  </div>
</body>
</html>
`;

	return resend.emails.send({
		from,
		to,
		subject,
		text,
		html,
	});
}
