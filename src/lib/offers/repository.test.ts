import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";
import { createComponent } from "#/lib/components/repository";

import {
	createOffer,
	DuplicateOfferError,
	InvalidProfessorError,
	listOffersByClass,
} from "./repository";

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
		CREATE TABLE classes (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			academic_period TEXT NOT NULL,
			course TEXT,
			grade TEXT,
			shift TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE components (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE class_offers (
			id TEXT PRIMARY KEY,
			class_id TEXT NOT NULL,
			component_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (class_id, component_id),
			FOREIGN KEY (class_id) REFERENCES classes(id),
			FOREIGN KEY (component_id) REFERENCES components(id)
		);
		CREATE TABLE offer_professors (
			id TEXT PRIMARY KEY,
			offer_id TEXT NOT NULL,
			staff_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (offer_id, staff_id),
			FOREIGN KEY (offer_id) REFERENCES class_offers(id),
			FOREIGN KEY (staff_id) REFERENCES staff(id)
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

async function seed(db: DB) {
	const [klass] = await db
		.insert(schema.classes)
		.values({ id: "t1", name: "7º A", academicPeriod: "2026" })
		.returning();
	const component = await createComponent(db, { name: "Matemática" });
	return { klass, component };
}

describe("offers repository", () => {
	it("cria oferta com professores vinculados", async () => {
		const { db } = createTestDb();
		const { klass, component } = await seed(db);
		const [professor] = await db
			.insert(schema.staff)
			.values({ id: "p1", name: "João Silva" })
			.returning();

		const offer = await createOffer(db, {
			classId: klass.id,
			componentId: component.id,
			professorIds: [professor.id],
		});
		expect(offer.classId).toBe(klass.id);
		expect(offer.componentId).toBe(component.id);

		const listed = await listOffersByClass(db, klass.id);
		expect(listed).toHaveLength(1);
		expect(listed[0].component?.name).toBe("Matemática");
		expect(listed[0].professors).toHaveLength(1);
		expect(listed[0].professors?.[0].staffId).toBe("p1");
		expect(listed[0].professors?.[0].staff?.name).toBe("João Silva");
	});

	it("borda 2: permite oferta sem professores", async () => {
		const { db } = createTestDb();
		const { klass, component } = await seed(db);

		const offer = await createOffer(db, {
			classId: klass.id,
			componentId: component.id,
		});
		expect(offer.id).toBeTypeOf("string");
		const listed = await listOffersByClass(db, klass.id);
		expect(listed[0].professors).toHaveLength(0);
	});

	it("borda 3: rejeita professor não cadastrado ou inativo", async () => {
		const { db } = createTestDb();
		const { klass, component } = await seed(db);

		await expect(
			createOffer(db, {
				classId: klass.id,
				componentId: component.id,
				professorIds: ["inexistente"],
			}),
		).rejects.toThrow(InvalidProfessorError);

		// Soft delete: professor existente porém inativo também é rejeitado.
		// (componente novo: a tentativa anterior já criou a oferta de t1+component)
		const outro = await createComponent(db, { name: "Programação" });
		await db
			.insert(schema.staff)
			.values({ id: "p2", name: "Maria Souza" })
			.returning();
		await db
			.update(schema.staff)
			.set({ deletedAt: new Date() })
			.where(eq(schema.staff.id, "p2"));

		await expect(
			createOffer(db, {
				classId: klass.id,
				componentId: outro.id,
				professorIds: ["p2"],
			}),
		).rejects.toThrow(InvalidProfessorError);
	});

	it("borda 4: rejeita oferta duplicada do mesmo componente na turma", async () => {
		const { db } = createTestDb();
		const { klass, component } = await seed(db);

		await createOffer(db, {
			classId: klass.id,
			componentId: component.id,
		});
		await expect(
			createOffer(db, {
				classId: klass.id,
				componentId: component.id,
			}),
		).rejects.toThrow(DuplicateOfferError);

		// Mesmo componente em outra turma é permitido.
		const [outra] = await db
			.insert(schema.classes)
			.values({ id: "t2", name: "8º B", academicPeriod: "2026" })
			.returning();
		const outraOferta = await createOffer(db, {
			classId: outra.id,
			componentId: component.id,
		});
		expect(outraOferta.classId).toBe("t2");
	});

	it("ignora professores duplicados no payload (idempotente)", async () => {
		const { db } = createTestDb();
		const { klass, component } = await seed(db);
		await db
			.insert(schema.staff)
			.values({ id: "p1", name: "João Silva" })
			.returning();

		const offer = await createOffer(db, {
			classId: klass.id,
			componentId: component.id,
			professorIds: ["p1", "p1"],
		});
		expect(offer.id).toBeTypeOf("string");
		const listed = await listOffersByClass(db, klass.id);
		expect(listed[0].professors).toHaveLength(1);
	});
});
