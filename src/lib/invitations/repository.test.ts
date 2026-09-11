import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it, vi } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";
import {
	countPendingInvitationsByUser,
	createInvitation,
	findInvitationByToken,
	hasPermanentAdmin,
	INVITATION_VALIDITY_MS,
	listInvitationsByUser,
	MAX_PENDING_INVITATIONS,
	markInvitationAccepted,
	revokeInvitation,
	validateInviteForRegistration,
} from "./repository";

vi.mock("#/lib/email/resend", () => ({
	sendInvitationEmail: vi.fn().mockResolvedValue({ data: { id: "ok" } }),
}));

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE user (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			email_verified INTEGER DEFAULT 0 NOT NULL,
			image TEXT,
			role TEXT DEFAULT 'user' NOT NULL,
			is_permanent_admin INTEGER DEFAULT 0 NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE invitation (
			id TEXT PRIMARY KEY NOT NULL,
			email TEXT NOT NULL,
			invited_by_id TEXT NOT NULL,
			token TEXT NOT NULL UNIQUE,
			status TEXT DEFAULT 'pending' NOT NULL,
			expires_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			accepted_at INTEGER,
			FOREIGN KEY (invited_by_id) REFERENCES user(id) ON DELETE CASCADE
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

function createLegacyUserDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE user (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			email_verified INTEGER DEFAULT 0 NOT NULL,
			image TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

describe("invitations repository", () => {
	it("verifica se existe admin permanente ou qualquer usuário", async () => {
		const { db, sqlite } = createTestDb();

		expect(await hasPermanentAdmin(db)).toBe(false);

		sqlite.exec(`
			INSERT INTO user (id, name, email, role, is_permanent_admin, created_at, updated_at)
			VALUES ('u1', 'Admin', 'admin@escola.test', 'admin', 1, ${Date.now()}, ${Date.now()});
		`);

		expect(await hasPermanentAdmin(db)).toBe(true);
	});

	it("detecta usuário em banco anterior à migration de papéis", async () => {
		const { db, sqlite } = createLegacyUserDb();

		sqlite.exec(`
			INSERT INTO user (id, name, email, created_at, updated_at)
			VALUES ('u1', 'Usuário legado', 'legado@escola.test', ${Date.now()}, ${Date.now()});
		`);

		expect(await hasPermanentAdmin(db)).toBe(true);
	});

	it("cria convite com 7 dias de validade e status pendente", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(`
			INSERT INTO user (id, name, email, role, is_permanent_admin, created_at, updated_at)
			VALUES ('u1', 'Professor', 'prof@escola.test', 'user', 0, ${Date.now()}, ${Date.now()});
		`);

		const before = Date.now();
		const inv = await createInvitation(db, {
			email: "NOVO@Escola.Test",
			invitedById: "u1",
			inviterName: "Professor",
		});

		expect(inv).toBeDefined();
		expect(inv.email).toBe("novo@escola.test");
		expect(inv.invitedById).toBe("u1");
		expect(inv.status).toBe("pending");
		expect(inv.token).toBeDefined();

		const expectedExpiry = before + INVITATION_VALIDITY_MS;
		expect(inv.expiresAt.getTime()).toBeGreaterThanOrEqual(
			expectedExpiry - 2000,
		);
		expect(inv.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 2000);
	});

	it("rejeita convite para e-mail já cadastrado no sistema", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(`
			INSERT INTO user (id, name, email, role, is_permanent_admin, created_at, updated_at)
			VALUES ('u1', 'Admin', 'admin@escola.test', 'admin', 1, ${Date.now()}, ${Date.now()});
		`);

		await expect(
			createInvitation(db, {
				email: "admin@escola.test",
				invitedById: "u1",
				inviterName: "Admin",
			}),
		).rejects.toThrow("Este e-mail já possui uma conta cadastrada.");
	});

	it("limita em no máximo 10 convites pendentes simultâneos por usuário", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(`
			INSERT INTO user (id, name, email, role, is_permanent_admin, created_at, updated_at)
			VALUES ('u1', 'User 1', 'u1@escola.test', 'user', 0, ${Date.now()}, ${Date.now()});
		`);

		for (let i = 1; i <= MAX_PENDING_INVITATIONS; i++) {
			await createInvitation(db, {
				email: `convidado${i}@escola.test`,
				invitedById: "u1",
				inviterName: "User 1",
			});
		}

		expect(await countPendingInvitationsByUser(db, "u1")).toBe(10);

		await expect(
			createInvitation(db, {
				email: "convidado11@escola.test",
				invitedById: "u1",
				inviterName: "User 1",
			}),
		).rejects.toThrow("Limite de 10 convites pendentes");
	});

	it("não contabiliza convites expirados, aceitos ou revogados no limite de 10", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(`
			INSERT INTO user (id, name, email, role, is_permanent_admin, created_at, updated_at)
			VALUES ('u1', 'User 1', 'u1@escola.test', 'user', 0, ${Date.now()}, ${Date.now()});
		`);

		const now = Date.now();
		// Inserir 10 convites, mas 3 já expirados/aceitos/revogados
		sqlite.exec(`
			INSERT INTO invitation (id, email, invited_by_id, token, status, expires_at, created_at)
			VALUES
				('c1', 'a@test.com', 'u1', 't1', 'accepted', ${now + 100000}, ${now}),
				('c2', 'b@test.com', 'u1', 't2', 'revoked', ${now + 100000}, ${now}),
				('c3', 'c@test.com', 'u1', 't3', 'pending', ${now - 1000}, ${now - 2000});
		`);

		expect(await countPendingInvitationsByUser(db, "u1")).toBe(0);

		// Deve permitir criar convites normalmente
		const inv = await createInvitation(db, {
			email: "novo@test.com",
			invitedById: "u1",
			inviterName: "User 1",
		});
		expect(inv).toBeDefined();
		expect(await countPendingInvitationsByUser(db, "u1")).toBe(1);
	});

	it("valida convite para cadastro e detecta expiração", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(`
			INSERT INTO user (id, name, email, role, is_permanent_admin, created_at, updated_at)
			VALUES ('u1', 'User 1', 'u1@escola.test', 'user', 0, ${Date.now()}, ${Date.now()});
		`);

		const validInv = await createInvitation(db, {
			email: "valido@escola.test",
			invitedById: "u1",
			inviterName: "User 1",
		});

		// Válido
		const check1 = await validateInviteForRegistration(
			db,
			validInv.token,
			"valido@escola.test",
		);
		expect(check1.valid).toBe(true);

		// Email diferente do convite
		const check2 = await validateInviteForRegistration(
			db,
			validInv.token,
			"outro@escola.test",
		);
		expect(check2.valid).toBe(false);
		expect(check2.error).toContain("não corresponde");

		// Token inexistente
		const check3 = await validateInviteForRegistration(
			db,
			"token-fantasma",
			"qualquer@escola.test",
		);
		expect(check3.valid).toBe(false);

		// Convite expirado
		sqlite.exec(`
			UPDATE invitation SET expires_at = ${Date.now() - 1000} WHERE id = '${validInv.id}';
		`);
		const check4 = await validateInviteForRegistration(
			db,
			validInv.token,
			"valido@escola.test",
		);
		expect(check4.valid).toBe(false);
		expect(check4.error).toContain("expirou");
	});

	it("marca convite como aceito", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(`
			INSERT INTO user (id, name, email, role, is_permanent_admin, created_at, updated_at)
			VALUES ('u1', 'User 1', 'u1@escola.test', 'user', 0, ${Date.now()}, ${Date.now()});
		`);

		const inv = await createInvitation(db, {
			email: "aceitar@escola.test",
			invitedById: "u1",
			inviterName: "User 1",
		});

		await markInvitationAccepted(db, inv.token);

		const updated = await findInvitationByToken(db, inv.token);
		expect(updated?.status).toBe("accepted");
		expect(updated?.acceptedAt).toBeDefined();

		const check = await validateInviteForRegistration(
			db,
			inv.token,
			"aceitar@escola.test",
		);
		expect(check.valid).toBe(false);
		expect(check.error).toContain("já foi utilizado");
	});

	it("permite revogar um convite pendente", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(`
			INSERT INTO user (id, name, email, role, is_permanent_admin, created_at, updated_at)
			VALUES ('u1', 'User 1', 'u1@escola.test', 'user', 0, ${Date.now()}, ${Date.now()});
		`);

		const inv = await createInvitation(db, {
			email: "cancelar@escola.test",
			invitedById: "u1",
			inviterName: "User 1",
		});

		await revokeInvitation(db, inv.id, "u1");

		const updated = await findInvitationByToken(db, inv.token);
		expect(updated?.status).toBe("revoked");

		const check = await validateInviteForRegistration(
			db,
			inv.token,
			"cancelar@escola.test",
		);
		expect(check.valid).toBe(false);
		expect(check.error).toContain("cancelado");
	});

	it("lista os convites enviados pelo usuário", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(`
			INSERT INTO user (id, name, email, role, is_permanent_admin, created_at, updated_at)
			VALUES
				('u1', 'User 1', 'u1@escola.test', 'user', 0, ${Date.now()}, ${Date.now()}),
				('u2', 'User 2', 'u2@escola.test', 'user', 0, ${Date.now()}, ${Date.now()});
		`);

		await createInvitation(db, {
			email: "convite-u1@escola.test",
			invitedById: "u1",
			inviterName: "User 1",
		});
		await createInvitation(db, {
			email: "convite-u2@escola.test",
			invitedById: "u2",
			inviterName: "User 2",
		});

		const list1 = await listInvitationsByUser(db, "u1");
		expect(list1).toHaveLength(1);
		expect(list1[0].email).toBe("convite-u1@escola.test");
	});
});
