import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";

import {
	createRole,
	DEFAULT_ROLES,
	ensureDefaultRoles,
	findRoleById,
	findRoleByNormalizedName,
	listRoles,
} from "./repository";

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE roles (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

describe("roles repository", () => {
	it("cria um papel", async () => {
		const { db } = createTestDb();
		const role = await createRole(db, { name: "Coordenação pedagógica" });
		expect(role.name).toBe("Coordenação pedagógica");
		expect(role.id).toBeTypeOf("string");
	});

	it("encontra papel por id", async () => {
		const { db } = createTestDb();
		const created = await createRole(db, { name: "Direção" });
		const found = await findRoleById(db, created.id);
		expect(found?.name).toBe("Direção");
	});

	it("detecta duplicidade ignorando acento, caixa e espaços", async () => {
		const { db } = createTestDb();
		await createRole(db, { name: "Coordenação pedagógica" });
		const found = await findRoleByNormalizedName(
			db,
			"  coordenacao PEDAGOGICA ",
		);
		expect(found?.name).toBe("Coordenação pedagógica");
	});

	it("garante apenas o papel padrão Professor de forma idempotente", async () => {
		const { db } = createTestDb();
		expect(DEFAULT_ROLES).toEqual(["Professor"]);
		await ensureDefaultRoles(db);
		await ensureDefaultRoles(db);
		const all = await listRoles(db, {});
		expect(all).toHaveLength(1);
		expect(all[0].name).toBe("Professor");
	});

	it("lista papéis com busca", async () => {
		const { db } = createTestDb();
		await createRole(db, { name: "Professor" });
		await createRole(db, { name: "Direção" });
		const results = await listRoles(db, { search: "Dir" });
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("Direção");
	});
});
