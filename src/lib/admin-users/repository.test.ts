import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database, { type Database as DatabaseInstance } from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";
import { account, session, user } from "#/db/schema";

import {
	countUsers,
	deleteUserWithCascade,
	findUserById,
	listUsers,
	updateUserRole,
} from "./repository";

function applyMigrations(sqlite: DatabaseInstance) {
	const files = readdirSync(join(process.cwd(), "drizzle"))
		.filter((file) => file.endsWith(".sql"))
		.sort();
	for (const file of files) {
		const content = readFileSync(join(process.cwd(), "drizzle", file), "utf-8");
		for (const statement of content
			.split(/-->\s*statement-breakpoint/)
			.map((s) => s.trim())
			.filter(Boolean)) {
			if (statement.includes("__drizzle_migrations")) continue;
			sqlite.exec(statement);
		}
	}
}

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.pragma("foreign_keys = ON");
	applyMigrations(sqlite);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

function insertUser(id: string, name: string, email: string) {
	return `
		INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
		VALUES ('${id}', '${name}', '${email}', 0, 1700000000000, 1700000000000);
	`;
}

describe("admin users repository", () => {
	it("promove à primeira conta o papel admin e isPermanentAdmin", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(insertUser("user-1", "Primeiro", "primeiro@example.com"));
		const first = await findUserById(db, "user-1");

		expect(first?.role).toBe("admin");
		expect(first?.isPermanentAdmin).toBe(true);
	});

	it("deixa as contas posteriores como user", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(insertUser("user-1", "Primeiro", "primeiro@example.com"));
		sqlite.exec(insertUser("user-2", "Segundo", "segundo@example.com"));

		const second = await findUserById(db, "user-2");
		expect(second?.role).toBe("user");
		expect(second?.isPermanentAdmin).toBe(false);
	});

	it("não permite criar contas já como admin ou administrador permanente", () => {
		const { db } = createTestDb();
		expect(() =>
			db
				.insert(user)
				.values({ id: "u", name: "N", email: "n@e.com", role: "admin" })
				.run(),
		).toThrow("new users must start as regular users");
		expect(() =>
			db
				.insert(user)
				.values({
					id: "u",
					name: "N",
					email: "n2@e.com",
					isPermanentAdmin: true,
				})
				.run(),
		).toThrow("new users must start as regular users");
	});

	it("rejeita papel fora do conjunto permitido", () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(insertUser("user-1", "Primeiro", "primeiro@example.com"));
		sqlite.exec(insertUser("user-2", "Segundo", "segundo@example.com"));
		expect(() =>
			db
				.update(user)
				.set({ role: "superuser" as never })
				.where(eq(user.id, "user-2"))
				.run(),
		).toThrow("invalid user role");
	});

	it("não permite alterar o administrador permanente", () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(insertUser("user-1", "Primeiro", "primeiro@example.com"));
		expect(() =>
			db.update(user).set({ role: "user" }).where(eq(user.id, "user-1")).run(),
		).toThrow("permanent administrator cannot be changed");
	});

	it("não permite excluir o administrador permanente", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(insertUser("user-1", "Primeiro", "primeiro@example.com"));
		await expect(deleteUserWithCascade(db, "user-1")).rejects.toThrow(
			"permanent administrator cannot be deleted",
		);
		expect(await findUserById(db, "user-1")).toBeDefined();
	});

	it("exclui outro user em cascata com sessões e credenciais", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(insertUser("user-1", "Primeiro", "primeiro@example.com"));
		sqlite.exec(insertUser("user-2", "Segundo", "segundo@example.com"));
		sqlite.exec(
			`
			INSERT INTO session (id, expires_at, token, created_at, updated_at, user_id)
			VALUES ('s1', 1700000000000, 'token-1', 1700000000000, 1700000000000, 'user-2');
			`,
		);
		sqlite.exec(
			`
			INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
			VALUES ('a1', 'acc-1', 'credential', 'user-2', 'hash', 1700000000000, 1700000000000);
			`,
		);

		await deleteUserWithCascade(db, "user-2");

		expect(await findUserById(db, "user-2")).toBeUndefined();
		const sessions = await db
			.select()
			.from(session)
			.where(eq(session.userId, "user-2"));
		const accounts = await db
			.select()
			.from(account)
			.where(eq(account.userId, "user-2"));
		expect(sessions).toHaveLength(0);
		expect(accounts).toHaveLength(0);
		expect(await findUserById(db, "user-1")).not.toBeNull();
	});

	it("atualiza o papel de um user para admin", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(insertUser("user-2", "Segundo", "segundo@example.com"));

		const updated = await updateUserRole(db, "user-2", "admin");

		expect(updated.role).toBe("admin");
		expect((await findUserById(db, "user-2"))?.role).toBe("admin");
	});

	it("lista e conta usuários com busca por nome ou email", async () => {
		const { db, sqlite } = createTestDb();
		sqlite.exec(insertUser("u1", "Maria Souza", "maria@example.com"));
		sqlite.exec(insertUser("u2", "João Lima", "joao@example.com"));
		sqlite.exec(insertUser("u3", "Ana Souza", "ana@example.com"));

		expect(await countUsers(db)).toBe(3);
		expect(await countUsers(db, { search: "souza" })).toBe(2);
		expect(await countUsers(db, { search: "joao@" })).toBe(1);

		const byName = await listUsers(db, { search: "Maria" });
		expect(byName).toHaveLength(1);
		expect(byName[0].email).toBe("maria@example.com");

		const byEmail = await listUsers(db, { search: "ana@" });
		expect(byEmail).toHaveLength(1);
		expect(byEmail[0].name).toBe("Ana Souza");

		const page = await listUsers(db, { limit: 2, offset: 0 });
		expect(page).toHaveLength(2);
	});
});
