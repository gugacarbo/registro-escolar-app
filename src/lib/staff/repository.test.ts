import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";

import {
	countStaff,
	createStaff,
	findActiveStaffById,
	findStaffById,
	findStaffByName,
	listStaff,
	softDeleteStaff,
	updateStaff,
} from "./repository";
import { normalizeStaffName } from "./shared";

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE staff (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT,
			phone TEXT,
			notes TEXT,
			deleted_at INTEGER,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

describe("staff repository", () => {
	it("cria um servidor", async () => {
		const { db } = createTestDb();
		const member = await createStaff(db, { name: "João Silva" });
		expect(member.name).toBe("João Silva");
		expect(member.id).toBeTypeOf("string");
		expect(member.createdAt).toBeInstanceOf(Date);
	});

	it("encontra servidor por id", async () => {
		const { db } = createTestDb();
		const created = await createStaff(db, { name: "Maria Souza" });
		const found = await findStaffById(db, created.id);
		expect(found?.name).toBe("Maria Souza");
	});

	it("exclui servidor com soft delete da listagem mas mantém histórico", async () => {
		const { db } = createTestDb();
		const created = await createStaff(db, { name: "Carlos Lima" });
		await softDeleteStaff(db, created.id);
		const all = await listStaff(db, {});
		expect(all).toHaveLength(0);
		const history = await findStaffById(db, created.id);
		expect(history?.name).toBe("Carlos Lima");
		expect(history?.deletedAt).toBeInstanceOf(Date);
		const active = await findActiveStaffById(db, created.id);
		expect(active).toBeUndefined();
	});

	it("normaliza nome para detectar duplicidade", async () => {
		const { db } = createTestDb();
		await createStaff(db, { name: "José Santos" });
		const found = await findStaffByName(db, "José Santos");
		expect(found).toHaveLength(1);
		expect(normalizeStaffName(found[0].name)).toBe(
			normalizeStaffName("jose  santos "),
		);

		// Busca por nome não idêntico (ex.: sem acento e minúsculo) cai no fallback normalizado
		const foundNormalized = await findStaffByName(db, "jose santos");
		expect(foundNormalized).toHaveLength(1);
		expect(foundNormalized[0].name).toBe("José Santos");
	});

	it("atualiza os dados do servidor", async () => {
		const { db } = createTestDb();
		const created = await createStaff(db, { name: "João Silva" });
		const updated = await updateStaff(db, created.id, {
			email: "joao@escola.test",
		});
		expect(updated.email).toBe("joao@escola.test");
		expect((await findActiveStaffById(db, created.id))?.email).toBe(
			"joao@escola.test",
		);
	});

	it("busca servidores por nome ou email", async () => {
		const { db } = createTestDb();
		await createStaff(db, {
			name: "Ana Paula",
			email: "ana@example.com",
		});
		await createStaff(db, { name: "Bruna Lima" });
		const byName = await listStaff(db, { search: "Ana" });
		expect(byName).toHaveLength(1);
		const byEmail = await listStaff(db, { search: "ana@example" });
		expect(byEmail).toHaveLength(1);
	});

	it("conta servidores ativos respeitando a busca", async () => {
		const { db } = createTestDb();
		await createStaff(db, {
			name: "Ana Paula",
			email: "ana@example.com",
		});
		const deleted = await createStaff(db, { name: "Bruna Lima" });
		await softDeleteStaff(db, deleted.id);
		expect(await countStaff(db, {})).toBe(1);
		expect(await countStaff(db, { search: "Ana" })).toBe(1);
		expect(await countStaff(db, { search: "Bruna" })).toBe(0);
		expect(await countStaff(db, { search: "  " })).toBe(1);
	});
});
