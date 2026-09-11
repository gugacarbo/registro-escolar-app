import { and, desc, eq, gt, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { invitation, user } from "#/db/schema";
import { sendInvitationEmail } from "#/lib/email/resend";

export const MAX_PENDING_INVITATIONS = 10;
export const INVITATION_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface CreateInvitationOptions {
	email: string;
	invitedById: string;
	inviterName: string;
	appBaseURL?: string;
	resendApiKey?: string;
	resendFrom?: string;
}

export async function countPendingInvitationsByUser(
	db: DB,
	userId: string,
): Promise<number> {
	const now = new Date();
	const result = await db
		.select({ count: sql<number>`count(*)` })
		.from(invitation)
		.where(
			and(
				eq(invitation.invitedById, userId),
				eq(invitation.status, "pending"),
				gt(invitation.expiresAt, now),
			),
		)
		.get();

	return Number(result?.count ?? 0);
}

export async function hasPermanentAdmin(db: DB): Promise<boolean> {
	const admin = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.isPermanentAdmin, true))
		.limit(1)
		.get();

	if (admin) return true;

	const anyUser = await db
		.select({ id: user.id })
		.from(user)
		.limit(1)
		.get();

	return Boolean(anyUser);
}

export async function createInvitation(
	db: DB,
	{
		email,
		invitedById,
		inviterName,
		appBaseURL,
		resendApiKey,
		resendFrom,
	}: CreateInvitationOptions,
) {
	const normalizedEmail = email.trim().toLowerCase();

	const existingUser = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, normalizedEmail))
		.limit(1)
		.get();

	if (existingUser) {
		throw new Error("Este e-mail já possui uma conta cadastrada.");
	}

	const pendingCount = await countPendingInvitationsByUser(db, invitedById);
	if (pendingCount >= MAX_PENDING_INVITATIONS) {
		throw new Error(
			`Limite de ${MAX_PENDING_INVITATIONS} convites pendentes simultâneos atingido. Aguarde a aceitação ou expiração de convites existentes.`,
		);
	}

	const now = new Date();
	const expiresAt = new Date(now.getTime() + INVITATION_VALIDITY_MS);
	const token = crypto.randomUUID();
	const id = crypto.randomUUID();

	const newInvitation = await db
		.insert(invitation)
		.values({
			id,
			email: normalizedEmail,
			invitedById,
			token,
			status: "pending",
			expiresAt,
			createdAt: now,
		})
		.returning()
		.get();

	const baseURL =
		appBaseURL ||
		(typeof process !== "undefined" ? process.env.BETTER_AUTH_URL : undefined) ||
		"http://localhost:3001";
	const inviteUrl = `${baseURL.replace(/\/+$/, "")}/register?token=${token}`;

	try {
		await sendInvitationEmail({
			to: normalizedEmail,
			inviterName,
			inviteUrl,
			apiKey: resendApiKey,
			from: resendFrom,
		});
	} catch (error) {
		// Log error if email fails, but keep created invitation so it can be copied or resent
		console.error("Falha ao enviar e-mail via Resend:", error);
	}

	return newInvitation;
}

export async function findInvitationByToken(db: DB, token: string) {
	const inv = await db
		.select()
		.from(invitation)
		.where(eq(invitation.token, token))
		.limit(1)
		.get();

	if (!inv) return null;

	if (inv.status === "pending" && inv.expiresAt.getTime() <= Date.now()) {
		await db
			.update(invitation)
			.set({ status: "expired" })
			.where(eq(invitation.id, inv.id));
		return { ...inv, status: "expired" as const };
	}

	return inv;
}

export async function validateInviteForRegistration(
	db: DB,
	token: string,
	email: string,
) {
	const inv = await findInvitationByToken(db, token);
	if (!inv) {
		return { valid: false, error: "Convite não encontrado." };
	}

	if (inv.status !== "pending") {
		if (inv.status === "accepted") {
			return { valid: false, error: "Este convite já foi utilizado." };
		}
		if (inv.status === "expired") {
			return {
				valid: false,
				error: "Este convite expirou. Convites têm validade de 7 dias.",
			};
		}
		return { valid: false, error: "Este convite foi cancelado." };
	}

	if (inv.expiresAt.getTime() <= Date.now()) {
		return {
			valid: false,
			error: "Este convite expirou. Convites têm validade de 7 dias.",
		};
	}

	if (inv.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
		return {
			valid: false,
			error: "O e-mail informado não corresponde ao e-mail do convite.",
		};
	}

	return { valid: true, invitation: inv };
}

export async function markInvitationAccepted(db: DB, token: string) {
	return db
		.update(invitation)
		.set({
			status: "accepted",
			acceptedAt: new Date(),
		})
		.where(eq(invitation.token, token))
		.returning()
		.get();
}

export async function listInvitationsByUser(db: DB, userId: string) {
	return db
		.select()
		.from(invitation)
		.where(eq(invitation.invitedById, userId))
		.orderBy(desc(invitation.createdAt));
}

export async function revokeInvitation(db: DB, id: string, userId: string) {
	const inv = await db
		.select()
		.from(invitation)
		.where(and(eq(invitation.id, id), eq(invitation.invitedById, userId)))
		.limit(1)
		.get();

	if (!inv) {
		throw new Error("Convite não encontrado.");
	}

	if (inv.status !== "pending") {
		throw new Error("Apenas convites pendentes podem ser cancelados.");
	}

	return db
		.update(invitation)
		.set({ status: "revoked" })
		.where(eq(invitation.id, id))
		.returning()
		.get();
}
