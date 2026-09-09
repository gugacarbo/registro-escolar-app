import {
	baseURL,
	createClass,
	createEnrollment,
	createGeneralReport,
	createIndependentRecord,
	createLinkedRecord,
	createMeeting,
	createMinuteTemplate,
	createStudent,
	generateMinute,
	previewMinute,
	startMeeting,
	updateMeetingTemplate,
	transitionMeetingResponse,
} from "./fixtures/api";
import { expect, test } from "./fixtures/test";

test.describe("SPEC-0009 geração de ata", () => {
	test("prévia funciona em rascunho mas geração oficial é rejeitada", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Ata Rascunho", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Ata Rascunho",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		const preview = await previewMinute(apiContext, meeting.id);
		expect(preview.status).toBe("draft");
		expect(preview.content).toContain("ATA — ATA RASCUNHO");

		const generateResponse = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/minutes`,
			{ method: "POST", headers: { Cookie: apiContext.cookies } },
		);
		expect(generateResponse.status).toBe(409);
	});

	test("gera versão oficial com PDF após finalização", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Ata Oficial", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Ata Oficial",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		const finish = await transitionMeetingResponse(apiContext, meeting.id, "finalize");
		expect(finish.status).toBe(200);

		const generated = await generateMinute(apiContext, meeting.id, "Versão v1");
		expect(generated).toMatchObject({ version: 1, isCurrent: true, pdfSize: expect.any(Number) });
		expect(generated.pdfSize).toBeGreaterThan(0);

		const pdfResponse = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/minutes/versions/1/pdf`,
			{ headers: { Cookie: apiContext.cookies } },
		);
		expect(pdfResponse.status).toBe(200);
		expect(pdfResponse.headers.get("content-type")).toBe("application/pdf");
	});

	test("gera ata mínima quando não há registros marcados", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Ata Mínima", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Ata Mínima",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		await createGeneralReport(apiContext, meeting.id, "Relato público mínimo");
		const preview = await previewMinute(apiContext, meeting.id);
		expect(preview.content).toContain("ATA — ATA MÍNIMA");
		expect(preview.content).toContain("Relatos gerais");
		expect(preview.content).toContain("Relato público mínimo");
		expect(preview.content).not.toContain("Registros por aluno");

		await transitionMeetingResponse(apiContext, meeting.id, "finalize");
		const generated = await generateMinute(apiContext, meeting.id);
		expect(generated.pdfSize).toBeGreaterThan(0);
	});

	test("gera ata mínima quando todos os relatos são internos", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Ata Sem Relatos", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Ata Sem Relatos",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		await createGeneralReport(apiContext, meeting.id, "Relato interno", {
			incluirNaAta: false,
		});
		const preview = await previewMinute(apiContext, meeting.id);
		expect(preview.content).not.toContain("Relato interno");
		expect(preview.content).not.toContain("Relatos gerais");

		await transitionMeetingResponse(apiContext, meeting.id, "finalize");
		const generated = await generateMinute(apiContext, meeting.id);
		expect(generated.pdfSize).toBeGreaterThan(0);
	});

	test("próxima prévia reflete alteração de template", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Ata Template", "2026");
		const firstTemplate = await createMinuteTemplate(apiContext, {
			name: "Template A",
			headerText: "Cabeçalho A",
		});
		const meeting = await createMeeting(apiContext, {
			title: "Ata Template",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
			templateId: firstTemplate.id,
		});
		const firstPreview = await previewMinute(apiContext, meeting.id);
		expect(firstPreview.templateId).toBe(firstTemplate.id);
		expect(firstPreview.content).toContain("CABEÇALHO A");

		const secondTemplate = await createMinuteTemplate(apiContext, {
			name: "Template B",
			headerText: "Cabeçalho B",
		});
		await updateMeetingTemplate(apiContext, meeting.id, secondTemplate.id);
		const secondPreview = await previewMinute(apiContext, meeting.id);
		expect(secondPreview.templateId).toBe(secondTemplate.id);
		expect(secondPreview.content).toContain("CABEÇALHO B");
		expect(secondPreview.content).not.toContain("CABEÇALHO A");
	});

	test("omite internos e agrupa registros por turma e aluno", async ({
		apiContext,
	}) => {
		const klassA = await createClass(apiContext, "Turma Ata A", "2026");
		const klassB = await createClass(apiContext, "Turma Ata B", "2026");
		const studentA = await createStudent(apiContext, "Aluna Ata A");
		const studentB = await createStudent(apiContext, "Aluno Ata B");
		await createEnrollment(apiContext, {
			alunoId: studentA.id,
			turmaId: klassA.id,
			dataInicio: "2026-01-01",
		});
		await createEnrollment(apiContext, {
			alunoId: studentB.id,
			turmaId: klassB.id,
			dataInicio: "2026-01-01",
		});
		const meeting = await createMeeting(apiContext, {
			title: "Ata Agrupada",
			heldAt: "2026-05-10",
			classIds: [klassA.id, klassB.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		await createLinkedRecord(apiContext, meeting.id, studentA.id, "Registro A público");
		await createLinkedRecord(apiContext, meeting.id, studentA.id, "Registro A interno", {
			incluirNaAta: false,
		});
		await createLinkedRecord(apiContext, meeting.id, studentB.id, "Registro B público");
		await createIndependentRecord(apiContext, studentB.id, "Contexto B incluído por padrão", {
			turmaId: klassB.id,
		});

		const preview = await previewMinute(apiContext, meeting.id);
		expect(preview.content).toContain("Registros por aluno");
		expect(preview.content).toContain("Turma Ata A");
		expect(preview.content).toContain("Aluna Ata A: Registro A público");
		expect(preview.content).toContain("Turma Ata B");
		expect(preview.content).toContain("Aluno Ata B: Registro B público");
		expect(preview.content).not.toContain("Registro A interno");
		// Independent default is included when no explicit inclusion row exists.
		expect(preview.content).toContain("Contexto B incluído por padrão");
	});
});
