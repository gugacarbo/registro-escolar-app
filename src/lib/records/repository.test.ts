import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";

import type { DB } from "#/db";
import { recordMeetingInclusions } from "#/db/records-schema";
import * as schema from "#/db/schema";

import {
	InvalidOriginError,
	RecordNotFoundError,
	RecordNotLinkedToMeetingError,
} from "./errors";
import {
	createIndependentRecord,
	createLinkedRecord,
	listIndependentRecordsByStudent,
	listStudentRecordsForMeeting,
	setIndependentRecordInclusion,
	updateLinkedRecord,
} from "./repository";

const meetingDate = new Date("2025-06-10T12:00:00.000Z");

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE meetings (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'draft',
			held_at INTEGER,
			template_id TEXT,
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
		CREATE TABLE meeting_classes (
			id TEXT PRIMARY KEY,
			meeting_id TEXT NOT NULL,
			class_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (meeting_id, class_id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id),
			FOREIGN KEY (class_id) REFERENCES classes(id)
		);
		CREATE TABLE students (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			document TEXT,
			registration_number TEXT,
			email TEXT,
			phone TEXT,
			birth_date INTEGER,
			notes TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
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
		CREATE TABLE roles (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE meeting_participants (
			id TEXT PRIMARY KEY,
			meeting_id TEXT NOT NULL,
			staff_id TEXT NOT NULL,
			role_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (meeting_id, staff_id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id),
			FOREIGN KEY (staff_id) REFERENCES staff(id),
			FOREIGN KEY (role_id) REFERENCES roles(id)
		);
		CREATE TABLE components (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE student_records (
			id TEXT PRIMARY KEY,
			student_id TEXT NOT NULL,
			meeting_id INTEGER,
			class_id TEXT,
			component_id TEXT,
			origin_id TEXT,
			texto TEXT NOT NULL,
			categoria_id TEXT,
			include_in_minutes INTEGER DEFAULT 1 NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			FOREIGN KEY (student_id) REFERENCES students(id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id),
			FOREIGN KEY (class_id) REFERENCES classes(id),
			FOREIGN KEY (component_id) REFERENCES components(id),
			FOREIGN KEY (origin_id) REFERENCES meeting_participants(id)
		);
		CREATE TABLE record_meeting_inclusions (
			id TEXT PRIMARY KEY,
			student_record_id TEXT NOT NULL,
			meeting_id TEXT NOT NULL,
			include INTEGER DEFAULT 1 NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (student_record_id, meeting_id),
			FOREIGN KEY (student_record_id) REFERENCES student_records(id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id)
		);
		CREATE INDEX student_records_student_idx ON student_records (student_id);
		CREATE INDEX student_records_meeting_student_idx ON student_records (meeting_id, student_id);
		CREATE INDEX student_records_meeting_idx ON student_records (meeting_id);
		CREATE INDEX student_records_class_idx ON student_records (class_id);
		CREATE UNIQUE INDEX record_meeting_inclusions_record_meeting_uidx ON record_meeting_inclusions (student_record_id, meeting_id);
		CREATE INDEX record_meeting_inclusions_meeting_idx ON record_meeting_inclusions (meeting_id);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

async function seedBase(db: DB) {
	await db.insert(schema.meetings).values([
		{ id: "meeting-1", title: "Conselho 1º Ano", heldAt: meetingDate },
		{ id: "meeting-2", title: "Conselho 2º Ano", heldAt: meetingDate },
	]);
	await db.insert(schema.classes).values([
		{ id: "class-1", name: "1º Ano A", academicPeriod: "2025" },
		{ id: "class-2", name: "2º Ano B", academicPeriod: "2025" },
	]);
	await db.insert(schema.meetingClasses).values([
		{ id: "link-1", meetingId: "meeting-1", classId: "class-1" },
		{ id: "link-2", meetingId: "meeting-2", classId: "class-2" },
	]);
	await db.insert(schema.students).values({
		id: "student-1",
		name: "Ana Souza",
		registrationNumber: "2025001",
	});
	await db.insert(schema.staff).values({ id: "staff-1", name: "Prof. Lima" });
	await db.insert(schema.roles).values({ id: "role-1", name: "Conselheiro" });
	await db.insert(schema.meetingParticipants).values([
		{
			id: "participant-1",
			meetingId: "meeting-1",
			staffId: "staff-1",
			roleId: "role-1",
		},
		{
			id: "participant-2",
			meetingId: "meeting-2",
			staffId: "staff-1",
			roleId: "role-1",
		},
	]);
	await db.insert(schema.components).values({
		id: "component-1",
		name: "Matemática",
	});
}

describe("createIndependentRecord", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
	});

	it("cria registro sem reunião com includeInMinutes padrão true", async () => {
		const row = await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Acompanhamento pedagógico externo",
		});
		expect(row.meetingId).toBeNull();
		expect(row.originId).toBeNull();
		expect(row.includeInMinutes).toBe(true);
		expect(row.texto).toBe("Acompanhamento pedagógico externo");
	});

	it("persiste campos opcionais turma/componente/categoria", async () => {
		const row = await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Registro com vínculos",
			turmaId: "class-1",
			componenteId: "component-1",
			categoriaId: "cat-1",
			incluirNaAta: false,
		});
		expect(row.classId).toBe("class-1");
		expect(row.componentId).toBe("component-1");
		expect(row.categoriaId).toBe("cat-1");
		expect(row.includeInMinutes).toBe(false);
	});

	it("trata string vazia em campo opcional como null", async () => {
		const row = await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Sem turma",
			turmaId: "  ",
		});
		expect(row.classId).toBeNull();
	});

	it("rejeita aluno inexistente", async () => {
		await expect(
			createIndependentRecord(setup.db, {
				studentId: "missing",
				texto: "Texto",
			}),
		).rejects.toBeInstanceOf(RecordNotFoundError);
	});
});

describe("createLinkedRecord", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
	});

	it("cria registro vinculado à reunião com origem participante", async () => {
		const row = await createLinkedRecord(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
			texto: "Baixo rendimento em Matemática",
			origemId: "participant-1",
		});
		expect(row.meetingId).toBe("meeting-1");
		expect(row.originId).toBe("participant-1");
		expect(row.includeInMinutes).toBe(true);
	});

	it("rejeita origem que não participa da reunião (CA-005)", async () => {
		await expect(
			createLinkedRecord(setup.db, {
				meetingId: "meeting-1",
				studentId: "student-1",
				texto: "Registro",
				origemId: "participant-2",
			}),
		).rejects.toBeInstanceOf(InvalidOriginError);
	});

	it("mantém múltiplos registros independentes para o mesmo aluno (CA-003)", async () => {
		const texts = ["Registro 1", "Registro 2", "Registro 3", "Registro 4"];
		for (const texto of texts) {
			await createLinkedRecord(setup.db, {
				meetingId: "meeting-1",
				studentId: "student-1",
				texto,
			});
		}
		const list = await listStudentRecordsForMeeting(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
		});
		expect(list).toHaveLength(4);
		expect(list.map((row) => row.texto)).toEqual(texts);
	});
});

describe("updateLinkedRecord", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
	});

	it("edita texto, origem e inclusão na ata", async () => {
		const created = await createLinkedRecord(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
			texto: "Original",
		});
		const updated = await updateLinkedRecord(setup.db, {
			meetingId: "meeting-1",
			recordId: created.id,
			texto: "Editado",
			origemId: "participant-1",
			incluirNaAta: false,
		});
		expect(updated.texto).toBe("Editado");
		expect(updated.originId).toBe("participant-1");
		expect(updated.includeInMinutes).toBe(false);
	});

	it("edita categoria e componente opcionais", async () => {
		const created = await createLinkedRecord(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
			texto: "Original",
		});
		const updated = await updateLinkedRecord(setup.db, {
			meetingId: "meeting-1",
			recordId: created.id,
			categoriaId: "categoria-2",
		});
		expect(updated.categoriaId).toBe("categoria-2");
		expect(updated.componentId).toBeNull();
	});

	it("rejeita registro de outra reunião", async () => {
		const created = await createLinkedRecord(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
			texto: "Original",
		});
		await expect(
			updateLinkedRecord(setup.db, {
				meetingId: "meeting-2",
				recordId: created.id,
				texto: "Editado",
			}),
		).rejects.toBeInstanceOf(RecordNotLinkedToMeetingError);
	});

	it("rejeita edição com origem fora da reunião", async () => {
		const created = await createLinkedRecord(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
			texto: "Original",
		});
		await expect(
			updateLinkedRecord(setup.db, {
				meetingId: "meeting-1",
				recordId: created.id,
				texto: "Editado",
				origemId: "participant-2",
			}),
		).rejects.toBeInstanceOf(InvalidOriginError);
	});

	it("rejeita registro inexistente", async () => {
		await expect(
			updateLinkedRecord(setup.db, {
				meetingId: "meeting-1",
				recordId: "missing",
				texto: "Editado",
			}),
		).rejects.toBeInstanceOf(RecordNotFoundError);
	});
});

describe("listStudentRecordsForMeeting", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
	});

	it("inclui registro independente quando a reunião tem a turma dele (borda 7)", async () => {
		await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Contexto do aluno",
			turmaId: "class-1",
		});
		const list = await listStudentRecordsForMeeting(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
		});
		expect(list).toHaveLength(1);
		expect(list[0]?.scope).toBe("contexto");
		expect(list[0]?.includeInMinutes).toBe(true);
	});

	it("omite registro independente de turma fora da reunião (borda 8)", async () => {
		await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Contexto de outra turma",
			turmaId: "class-2",
		});
		const list = await listStudentRecordsForMeeting(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
		});
		expect(list).toHaveLength(0);
	});

	it("registro independente sem turma aparece em qualquer reunião do aluno", async () => {
		await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Contexto geral",
		});
		for (const meetingId of ["meeting-1", "meeting-2"]) {
			const list = await listStudentRecordsForMeeting(setup.db, {
				meetingId,
				studentId: "student-1",
			});
			expect(list).toHaveLength(1);
		}
	});

	it("separa escopos vinculado e contexto", async () => {
		await createLinkedRecord(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
			texto: "Discussão do conselho",
		});
		await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Contexto",
			turmaId: "class-1",
		});
		const list = await listStudentRecordsForMeeting(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
		});
		expect(list.map((row) => row.scope).sort()).toEqual([
			"contexto",
			"vinculado",
		]);
	});

	it("não traz registros vinculados de outra reunião", async () => {
		await createLinkedRecord(setup.db, {
			meetingId: "meeting-2",
			studentId: "student-1",
			texto: "Outra reunião",
		});
		const list = await listStudentRecordsForMeeting(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
		});
		expect(list).toHaveLength(0);
	});
});

describe("setIndependentRecordInclusion", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
	});

	it("desmarcar inclusão não altera o registro original (CA-009/borda 9)", async () => {
		const created = await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Contexto",
			turmaId: "class-1",
		});
		await setIndependentRecordInclusion(setup.db, {
			recordId: created.id,
			meetingId: "meeting-1",
			include: false,
		});
		const list = await listStudentRecordsForMeeting(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
		});
		expect(list).toHaveLength(1);
		expect(list[0]?.includeInMinutes).toBe(false);

		const rows = await setup.db.select().from(schema.studentRecords);
		expect(rows[0]?.includeInMinutes).toBe(true);

		const other = await listStudentRecordsForMeeting(setup.db, {
			meetingId: "meeting-2",
			studentId: "student-1",
		});
		expect(other).toHaveLength(0);
	});

	it("atualiza a mesma decisão em vez de duplicar (índice único)", async () => {
		const created = await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Contexto sem turma",
		});
		await setIndependentRecordInclusion(setup.db, {
			recordId: created.id,
			meetingId: "meeting-1",
			include: false,
		});
		await setIndependentRecordInclusion(setup.db, {
			recordId: created.id,
			meetingId: "meeting-1",
			include: true,
		});
		const rows = await setup.db.select().from(recordMeetingInclusions);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.include).toBe(true);
	});

	it("mantém decisões independentes por reunião", async () => {
		const created = await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Contexto sem turma",
		});
		for (const meetingId of ["meeting-1", "meeting-2"]) {
			await setIndependentRecordInclusion(setup.db, {
				recordId: created.id,
				meetingId,
				include: meetingId === "meeting-1",
			});
		}
		const m1 = await listStudentRecordsForMeeting(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
		});
		const m2 = await listStudentRecordsForMeeting(setup.db, {
			meetingId: "meeting-2",
			studentId: "student-1",
		});
		expect(m1[0]?.includeInMinutes).toBe(true);
		expect(m2[0]?.includeInMinutes).toBe(false);
	});

	it("rejeita registro vinculado a reunião", async () => {
		const created = await createLinkedRecord(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
			texto: "Vinculado",
		});
		await expect(
			setIndependentRecordInclusion(setup.db, {
				recordId: created.id,
				meetingId: "meeting-1",
				include: false,
			}),
		).rejects.toBeInstanceOf(RecordNotLinkedToMeetingError);
	});
});

describe("listIndependentRecordsByStudent", () => {
	it("lista apenas registros sem reunião", async () => {
		const setup = createTestDb();
		await seedBase(setup.db);
		await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Independente",
		});
		await createLinkedRecord(setup.db, {
			meetingId: "meeting-1",
			studentId: "student-1",
			texto: "Vinculado",
		});
		const rows = await listIndependentRecordsByStudent(setup.db, "student-1");
		expect(rows).toHaveLength(1);
		expect(rows[0]?.texto).toBe("Independente");
	});
});

describe("setIndependentRecordInclusion ausência", () => {
	it("cria decisão quando ainda não existia", async () => {
		const setup = createTestDb();
		await seedBase(setup.db);
		const created = await createIndependentRecord(setup.db, {
			studentId: "student-1",
			texto: "Contexto",
		});
		const decision = await setIndependentRecordInclusion(setup.db, {
			recordId: created.id,
			meetingId: "meeting-1",
			include: false,
		});
		expect(decision.include).toBe(false);
	});
});
