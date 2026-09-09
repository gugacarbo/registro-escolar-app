import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";

import {
	createComponent,
	findComponentById,
	findComponentByNormalizedName,
	listComponents,
} from "./repository";

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE components (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (name)
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

describe("components repository", () => {
	it("cria um componente curricular", async () => {
		const { db } = createTestDb();
		const created = await createComponent(db, { name: "Matemática" });
		expect(created.id).toBeTypeOf("string");
		expect(created.name).toBe("Matemática");
		expect(created.createdAt).toBeInstanceOf(Date);
	});

	it("borda 1: detecta duplicidade normalizando acento, caixa e espaços", async () => {
		const { db } = createTestDb();
		await createComponent(db, { name: "Matemática" });
		const found = await findComponentByNormalizedName(db, "matematica ");
		expect(found?.name).toBe("Matemática");
		const none = await findComponentByNormalizedName(db, "Programação");
		expect(none).toBeUndefined();
	});

	it("busca por id e lista com busca textual", async () => {
		const { db } = createTestDb();
		const created = await createComponent(db, { name: "Matemática" });
		await createComponent(db, { name: "Programação" });
		const found = await findComponentById(db, created.id);
		expect(found?.name).toBe("Matemática");
		const results = await listComponents(db, { search: "Progr" });
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("Programação");
	});

	it("permite busca vazia e opcional", async () => {
		const { db } = createTestDb();
		await createComponent(db, { name: "Matemática" });
		const rows = await listComponents(db);
		expect(rows).toHaveLength(1);
	});
});
