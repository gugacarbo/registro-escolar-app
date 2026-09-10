/**
 * Seed de desenvolvimento com faker pt_BR.
 *
 * Gera volume realista coerente com o domínio (turmas, estudantes, matrículas,
 * servidores, reuniões, registros, relatos e atas) diretamente no D1 local.
 *
 * Uso:
 *   bun run db:local:migrate          # garante o schema
 *   bun run db:seed                   # popula o D1 local
 *   bun run db:seed -- --reset        # apaga dados e popula de novo
 *   SEED_SCALE=small bun run db:seed  # small | medium | large
 *
 * NUNCA rode contra o banco remoto — este script só toca o sqlite local
 * do wrangler (.wrangler/state/v3/d1).
 */
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { fakerPT_BR as faker } from "@faker-js/faker";
import { existsSync } from "node:fs";
import { join } from "node:path";

import * as schema from "../src/db/schema.ts";

const {
	students,
	staff,
	roles,
	classes,
	components,
	classOffers,
	offerProfessors,
	enrollments,
	meetings,
	meetingClasses,
	meetingParticipants,
	meetingStudentStatus,
	studentRecords,
	generalReports,
	minuteTemplates,
	minutes,
	minuteVersions,
} = schema;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

type Scale = "small" | "medium" | "large";

const SCALES: Record<
	Scale,
	{
		staff: number;
		students: number;
		classes: number;
		meetings: number;
		recordsPerMeeting: [number, number];
		reportsPerMeeting: [number, number];
	}
> = {
	small: {
		staff: 12,
		students: 60,
		classes: 4,
		meetings: 3,
		recordsPerMeeting: [5, 12],
		reportsPerMeeting: [1, 3],
	},
	medium: {
		staff: 25,
		students: 200,
		classes: 8,
		meetings: 6,
		recordsPerMeeting: [10, 25],
		reportsPerMeeting: [2, 5],
	},
	large: {
		staff: 50,
		students: 600,
		classes: 16,
		meetings: 12,
		recordsPerMeeting: [15, 40],
		reportsPerMeeting: [3, 8],
	},
};

const scale = (process.env.SEED_SCALE ?? "medium") as Scale;
const COUNT = SCALES[scale] ?? SCALES.medium;
const shouldReset = process.argv.includes("--reset");

// Seed fixa para dados reproduzíveis entre execuções
faker.seed(42);

// ---------------------------------------------------------------------------
// Banco local (D1 via miniflare)
// ---------------------------------------------------------------------------

const SQLITE_PATH = join(
	process.cwd(),
	".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
	"a4926725177bf51d2522ff30e24d859c3d392a5068faab53e3951d5df4f2664c.sqlite",
);

if (!existsSync(SQLITE_PATH)) {
	console.error(
		`Banco local não encontrado em ${SQLITE_PATH}\nRode antes: bun run db:local:migrate`,
	);
	process.exit(1);
}

const sqlite = new Database(SQLITE_PATH);
const db = drizzle(sqlite, { schema });

// ---------------------------------------------------------------------------
// Catálogos fixos (nomes reais do domínio, não aleatórios)
// ---------------------------------------------------------------------------

const ROLE_NAMES = [
	"Direção",
	"Coordenação Pedagógica",
	"Orientação Educacional",
	"Professor(a)",
	"Secretaria Escolar",
];

const COMPONENT_NAMES = [
	"Língua Portuguesa",
	"Matemática",
	"Ciências",
	"História",
	"Geografia",
	"Arte",
	"Educação Física",
	"Língua Inglesa",
];

const CLASS_NAMES = [
	"1º Ano A",
	"1º Ano B",
	"2º Ano A",
	"2º Ano B",
	"3º Ano A",
	"3º Ano B",
	"4º Ano A",
	"4º Ano B",
	"5º Ano A",
	"5º Ano B",
	"6º Ano A",
	"6º Ano B",
	"7º Ano A",
	"7º Ano B",
	"8º Ano A",
	"8º Ano B",
	"9º Ano A",
	"9º Ano B",
];

const SHIFTS = ["matutino", "vespertino", "noturno", "integral"];
const COURSES = ["Ensino Fundamental I", "Ensino Fundamental II"];
const ENROLLMENT_STATUSES = ["ativa", "transferida", "concluida", "cancelada"];
const TRACKING_STATUSES = [
	"pendente",
	"em_discussao",
	"concluido",
	"nao_discutido",
];
const APPROVAL_STATUSES = ["pendente_aprovacao", "aprovada"];
const MEETING_TITLES = [
	"Conselho de classe",
	"Reunião pedagógica",
	"Reunião com famílias",
	"Conselho extraordinário",
	"Planejamento bimestral",
];

const RECORD_TEXTS = [
	"Estudante participativo nas atividades em grupo, demonstra boa interação com os colegas.",
	"Apresenta dificuldade em Matemática; sugerido reforço no contraturno.",
	"Faltas recorrentes nas últimas semanas; família foi comunicada.",
	"Evolução significativa na leitura e interpretação de textos neste bimestre.",
	"Comportamento agitado em sala; combinados estabelecidos com a turma.",
	"Destaque em Ciências, com ótimo desempenho nas avaliações.",
	"Necessita de acompanhamento individualizado em Língua Portuguesa.",
	"Participação da família tem sido fundamental para o progresso do estudante.",
];

const REPORT_TEXTS = [
	"Turma com bom rendimento geral neste bimestre, com poucos casos críticos.",
	"Necessidade de reforçar a comunicação com as famílias sobre frequência.",
	"Calendário de avaliações do próximo bimestre foi alinhado com a equipe.",
	"Casos de indisciplina pontuais foram tratados com a orientação.",
	"Projeto interdisciplinar de leitura terá início na próxima semana.",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const id = () => crypto.randomUUID();
const pick = <T>(arr: readonly T[]): T =>
	arr[Math.floor(Math.random() * arr.length)];
const pickMany = <T>(arr: readonly T[], n: number): T[] => {
	const copy = [...arr];
	const out: T[] = [];
	while (out.length < n && copy.length > 0) {
		const i = Math.floor(Math.random() * copy.length);
		out.push(copy.splice(i, 1)[0] as T);
	}
	return out;
};
const between = (min: number, max: number) =>
	min + Math.floor(Math.random() * (max - min + 1));

function documentNumber(): string {
	// RG ou CPF fictício — apenas formato, sem validade real
	return Math.random() < 0.5
		? faker.string.numeric({ length: 9, allowLeadingZeros: true })
		: `${faker.string.numeric({ length: 3, allowLeadingZeros: true })}.${faker.string.numeric({ length: 3, allowLeadingZeros: true })}.${faker.string.numeric({ length: 3, allowLeadingZeros: true })}-${faker.string.numeric({ length: 2, allowLeadingZeros: true })}`;
}

function birthDate(): Date {
	return faker.date.birthdate({ min: 6, max: 17, mode: "age" });
}

function pastDate(daysBack: number): Date {
	return faker.date.recent({ days: daysBack });
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
	console.log(`🌱 Seed (${scale}): populando D1 local...`);

	if (shouldReset) {
		console.log("🧹 --reset: limpando tabelas...");
		// Ordem reversa de dependência (filhas primeiro) para respeitar FKs
		const tables = [
			"minute_versions",
			"minutes",
			"minute_templates",
			"general_reports",
			"record_meeting_inclusions",
			"student_records",
			"meeting_student_status",
			"meeting_participants",
			"meeting_classes",
			"meetings",
			"enrollments",
			"offer_professors",
			"class_offers",
			"classes",
			"components",
			"students",
			"staff",
			"roles",
			"session",
			"account",
			"verification",
			"user",
		];
		sqlite.exec("PRAGMA foreign_keys = OFF;");
		for (const table of tables) {
			sqlite.exec(`DELETE FROM "${table}";`);
		}
		sqlite.exec("PRAGMA foreign_keys = ON;");
		console.log("   tabelas limpas.");
	}

	// 1. Papéis (catálogo fixo, idempotente via upsert por nome)
	console.log("  → papéis...");
	const roleRows = await db
		.insert(roles)
		.values(ROLE_NAMES.map((name) => ({ id: id(), name })))
		.onConflictDoNothing({ target: roles.name })
		.returning();
	// Se já existiam, busca os atuais
	const allRoles =
		roleRows.length > 0 ? roleRows : await db.select().from(roles);
	const professorRole =
		allRoles.find((r) => r.name === "Professor(a)") ?? allRoles[0];
	if (!professorRole) throw new Error("Nenhum papel encontrado");

	// 2. Componentes curriculares (catálogo fixo, idempotente)
	console.log("  → componentes...");
	const componentRows = await db
		.insert(components)
		.values(COMPONENT_NAMES.map((name) => ({ id: id(), name })))
		.onConflictDoNothing({ target: components.name })
		.returning();
	const allComponents =
		componentRows.length > 0
			? componentRows
			: await db.select().from(components);

	// 3. Servidores
	console.log(`  → ${COUNT.staff} servidores...`);
	const staffRows = await db
		.insert(staff)
		.values(
			Array.from({ length: COUNT.staff }, () => {
				const firstName = faker.person.firstName();
				const lastName = faker.person.lastName();
				return {
					id: id(),
					name: `${firstName} ${lastName}`,
					email: faker.internet
						.email({ firstName, lastName })
						.toLowerCase(),
					phone: faker.phone.number({ style: "national" }),
					notes:
						Math.random() < 0.3 ? faker.lorem.sentence() : null,
				};
			}),
		)
		.returning();

	// 4. Turmas
	console.log(`  → ${COUNT.classes} turmas...`);
	const classRows = await db
		.insert(classes)
		.values(
			CLASS_NAMES.slice(0, COUNT.classes).map((name) => ({
				id: id(),
				name,
				academicPeriod: "2026",
				course: name.startsWith("1º") || name.startsWith("2º") || name.startsWith("3º") || name.startsWith("4º") || name.startsWith("5º")
					? COURSES[0]
					: COURSES[1],
				grade: name.split(" ").slice(0, 2).join(" "),
				shift: pick(SHIFTS) as string,
			})),
		)
		.returning();

	// 5. Ofertas (turma × componente) + professores por oferta
	console.log("  → ofertas e professores...");
	for (const classRow of classRows) {
		const offered = pickMany(
			allComponents,
			between(3, Math.min(6, allComponents.length)),
		);
		for (const component of offered) {
			const [offer] = await db
				.insert(classOffers)
				.values({
					id: id(),
					classId: classRow.id,
					componentId: component.id,
				})
				.returning();
			if (!offer) continue;
			const teachers = pickMany(
				staffRows,
				between(1, Math.min(2, staffRows.length)),
			);
			for (const teacher of teachers) {
				await db
					.insert(offerProfessors)
					.values({
						id: id(),
						offerId: offer.id,
						staffId: teacher.id,
					})
					.onConflictDoNothing();
			}
		}
	}

	// 6. Estudantes
	console.log(`  → ${COUNT.students} estudantes...`);
	const studentRows = await db
		.insert(students)
		.values(
			Array.from({ length: COUNT.students }, () => {
				const firstName = faker.person.firstName();
				const lastName = `${faker.person.lastName()} ${faker.person.lastName()}`;
				const name = `${firstName} ${lastName}`;
				return {
					id: id(),
					name,
					document: Math.random() < 0.7 ? documentNumber() : null,
					registrationNumber: faker.string.numeric({
						length: 8,
						allowLeadingZeros: false,
					}),
					email:
						Math.random() < 0.5
							? faker.internet
									.email({ firstName, lastName })
									.toLowerCase()
							: null,
					phone:
						Math.random() < 0.6
							? faker.phone.number({ style: "national" })
							: null,
					birthDate: birthDate(),
					notes:
						Math.random() < 0.2 ? faker.lorem.sentence() : null,
				};
			}),
		)
		.returning();

	// 7. Matrículas (cada estudante em 1 turma ativa; ~10% com histórico extra)
	console.log("  → matrículas...");
	for (const student of studentRows) {
		const classRow = pick(classRows);
		if (!classRow) continue;
		await db.insert(enrollments).values({
			id: id(),
			studentId: student.id,
			classId: classRow.id,
			startDate: faker.date.past({ years: 1 }),
			endDate: null,
			status: "ativa",
		});
		if (Math.random() < 0.1) {
			const other = pick(classRows.filter((c) => c.id !== classRow.id));
			if (other) {
				const start = faker.date.past({ years: 2 });
				await db.insert(enrollments).values({
					id: id(),
					studentId: student.id,
					classId: other.id,
					startDate: start,
					endDate: faker.date.between({
						from: start,
						to: new Date(),
					}),
					status: pick(ENROLLMENT_STATUSES.slice(1)) as string,
				});
			}
		}
	}

	// 8. Reuniões + vínculos (turmas, participantes, status por estudante)
	console.log(`  → ${COUNT.meetings} reuniões...`);
	for (let i = 0; i < COUNT.meetings; i++) {
		const meetingClassesSample = pickMany(
			classRows,
			between(1, Math.min(3, classRows.length)),
		);
		const heldAt =
			Math.random() < 0.6
				? pastDate(90)
				: faker.date.soon({ days: 30 });
		const [meeting] = await db
			.insert(meetings)
			.values({
				id: id(),
				title: `${pick(MEETING_TITLES)} — ${faker.date.month({ abbreviated: false })}`,
				status: i < 2 ? "finished" : pick(["draft", "in_progress", "finished"]),
				heldAt,
			})
			.returning();
		if (!meeting) continue;

		for (const classRow of meetingClassesSample) {
			await db.insert(meetingClasses).values({
				id: id(),
				meetingId: meeting.id,
				classId: classRow.id,
			});
		}

		const participantsSample = pickMany(
			staffRows,
			between(3, Math.min(8, staffRows.length)),
		);
		const participantRows: { id: string }[] = [];
		for (const person of participantsSample) {
			const [p] = await db
				.insert(meetingParticipants)
				.values({
					id: id(),
					meetingId: meeting.id,
					staffId: person.id,
					roleId: pick(allRoles).id,
				})
				.onConflictDoNothing()
				.returning();
			if (p) participantRows.push(p);
		}
		// professor(a) relator garante autoria válida dos registros
		const author =
			participantRows[0] ??
			(
				await db
					.insert(meetingParticipants)
					.values({
						id: id(),
						meetingId: meeting.id,
						staffId: pick(staffRows).id,
						roleId: professorRole.id,
					})
					.returning()
			)[0];
		if (!author) continue;

		// estudantes das turmas vinculadas
		const enrolled = await db
			.select({ studentId: enrollments.studentId })
			.from(enrollments)
			.where(
				sql`${enrollments.classId} IN (${sql.join(
					meetingClassesSample.map((c) => sql`${c.id}`),
					sql`, `,
				)}) AND ${enrollments.status} = 'ativa'`,
			)
			.limit(40);
		const discussed = pickMany(
			enrolled,
			Math.min(enrolled.length, between(...COUNT.recordsPerMeeting)),
		);

		for (const classRow of meetingClassesSample) {
			const inClass = discussed.slice(
				0,
				Math.ceil(discussed.length / meetingClassesSample.length),
			);
			for (const { studentId } of inClass) {
				await db
					.insert(meetingStudentStatus)
					.values({
						id: id(),
						meetingId: meeting.id,
						classId: classRow.id,
						studentId,
						status: pick(TRACKING_STATUSES) as string,
					})
					.onConflictDoNothing();
			}
		}

		// 9. Registros de estudante vinculados à reunião
		for (const { studentId } of discussed) {
			const n = between(1, 2);
			for (let k = 0; k < n; k++) {
				await db.insert(studentRecords).values({
					id: id(),
					studentId,
					meetingId: meeting.id,
					classId: pick(meetingClassesSample).id,
					componentId:
						Math.random() < 0.6 ? pick(allComponents).id : null,
					originId: author.id,
					texto: pick(RECORD_TEXTS),
					categoriaId: null,
					includeInMinutes: Math.random() < 0.8,
				});
			}
		}

		// 10. Relatos gerais da reunião
		const nReports = between(...COUNT.reportsPerMeeting);
		for (let k = 0; k < nReports; k++) {
			await db.insert(generalReports).values({
				id: id(),
				meetingId: meeting.id,
				originId: Math.random() < 0.8 ? author.id : null,
				categoryId: null,
				texto: pick(REPORT_TEXTS),
				includeInMinutes: Math.random() < 0.7,
			});
		}

		// 11. Ata da reunião (template + versão inicial)
		const [template] = await db
			.insert(minuteTemplates)
			.values({
				id: id(),
				name: `Modelo ${meeting.title.split("—")[0]?.trim() ?? "padrão"}`,
				headerText: "Prefeitura Municipal — Secretaria de Educação",
				footerText: "Documento gerado automaticamente (dados fictícios de desenvolvimento).",
				showMeeting: true,
				showClasses: true,
				showParticipants: true,
				showRecords: true,
				showGeneralReports: true,
				showSignatures: true,
			})
			.returning();
		const [minute] = await db
			.insert(minutes)
			.values({
				id: id(),
				meetingId: meeting.id,
				templateId: template?.id ?? null,
				approvalStatus: pick(APPROVAL_STATUSES) as string,
			})
			.returning();
		if (minute) {
			await db.insert(minuteVersions).values({
				id: id(),
				minuteId: minute.id,
				version: 1,
				content: `# ${meeting.title}\n\nConteúdo fictício gerado pelo seed de desenvolvimento.`,
				pdf: null,
				isCurrent: true,
				notes: "Versão inicial (seed)",
			});
		}
	}

	// 12. Alguns registros independentes (sem reunião)
	console.log("  → registros independentes...");
	for (let k = 0; k < between(10, 20); k++) {
		const student = pick(studentRows);
		if (!student) continue;
		await db.insert(studentRecords).values({
			id: id(),
			studentId: student.id,
			meetingId: null,
			classId: Math.random() < 0.5 ? pick(classRows).id : null,
			componentId: Math.random() < 0.4 ? pick(allComponents).id : null,
			originId: null,
			texto: pick(RECORD_TEXTS),
			categoriaId: null,
			includeInMinutes: true,
		});
	}

	console.log("✅ Seed concluído.");
	sqlite.close();
}

main().catch((err) => {
	console.error("❌ Falha no seed:", err);
	sqlite.close();
	process.exit(1);
});
