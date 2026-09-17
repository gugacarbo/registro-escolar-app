import { describe, expect, it } from "vitest";
import {
	type RenderInput,
	renderedToPlainText,
	renderMinute,
	serializeVersionRow,
} from "./render";
import { textDoc } from "./tiptap/serializer";

function baseInput(overrides: Partial<RenderInput> = {}): RenderInput {
	return {
		meeting: {
			id: "m-1",
			title: "Conselho de Classe 3º Ano",
			heldAt: new Date("2024-04-15T12:00:00Z"),
			location: "Sala dos Professores",
			templateId: null,
			status: "draft",
			createdAt: new Date(),
			updatedAt: new Date(),
		} as RenderInput["meeting"],
		template: null,
		classes: [],
		participants: [],
		records: [],
		generalReports: [],
		...overrides,
	};
}

describe("renderMinute", () => {
	it("renderiza ata mínima com título, data e assinaturas", () => {
		const rendered = renderMinute(
			baseInput({
				participants: [{ staffName: "Ana", roleName: "Coordenadora" }],
			}),
		);
		expect(rendered.title).toBe("Ata — Conselho de Classe 3º Ano");
		expect(rendered.lines[0]).toEqual({
			text: "Ata — Conselho de Classe 3º Ano",
			level: 1,
		});
		expect(rendered.lines.some((l) => l.text.includes("15/04/2024"))).toBe(
			true,
		);
		expect(rendered.lines.some((l) => l.text.includes("Ana"))).toBe(true);
	});

	it("usa 'data não informada' quando não há heldAt", () => {
		const rendered = renderMinute(
			baseInput({
				meeting: {
					...baseInput().meeting,
					heldAt: null,
				},
			}),
		);
		expect(
			rendered.lines.some((l) => l.text.includes("data não informada")),
		).toBe(true);
	});

	it("agrupa registros por turma", () => {
		const rendered = renderMinute(
			baseInput({
				records: [
					{
						className: "3A",
						studentName: "João",
						texto: "Bom desempenho",
					},
					{
						className: null,
						studentName: "Maria",
						texto: "Atenção",
					},
				],
			}),
		);
		const text = renderedToPlainText(rendered);
		expect(text).toContain("3A");
		expect(text).toContain("João: Bom desempenho");
		expect(text).toContain("Sem turma");
		expect(text).toContain("Maria: Atenção");
	});

	it("inclui turmas, participantes e relatos gerais quando presentes", () => {
		const rendered = renderMinute(
			baseInput({
				classes: [{ className: "3A" }, { className: "3B" }],
				participants: [{ staffName: "Ana", roleName: "Diretora" }],
				generalReports: [{ texto: "Relato geral da coordenação" }],
			}),
		);
		const text = renderedToPlainText(rendered);
		expect(text).toContain("Turmas");
		expect(text).toContain("3B");
		expect(text).toContain("Participantes");
		expect(text).toContain("Ana — Diretora");
		expect(text).toContain("Relatos gerais");
		expect(text).toContain("Relato geral da coordenação");
	});

	it("respeita flags do template (showMeeting/showClasses/showSignatures)", () => {
		const template = {
			id: "t-1",
			name: "Modelo",
			headerContent: textDoc("Cabeçalho do modelo"),
			footerContent: textDoc("Rodapé do modelo"),
			showMeeting: false,
			showClasses: false,
			showParticipants: false,
			showRecords: false,
			showGeneralReports: false,
			showSignatures: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as unknown as RenderInput["template"];
		const rendered = renderMinute(
			baseInput({
				template,
				classes: [{ className: "3A" }],
				participants: [{ staffName: "Ana", roleName: "Diretora" }],
				records: [
					{
						className: "3A",
						studentName: "João",
						texto: "Bom",
					},
				],
			}),
		);
		const text = renderedToPlainText(rendered);
		expect(text).toContain("CABEÇALHO DO MODELO");
		expect(text).toContain("RODAPÉ DO MODELO");
		expect(text).not.toContain("Data da reunião");
		expect(text).not.toContain("Turmas");
		expect(text).not.toContain("Participantes");
		expect(text).not.toContain("Registros por estudante");
		expect(text).not.toContain("Assinaturas");
	});

	it("preserva elementos visuais não-texto (imagens) no cabeçalho e rodapé", () => {
		const template = {
			id: "t-img",
			name: "Modelo com Imagem",
			headerContent: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "Logo da Escola:" }],
					},
					{
						type: "paragraph",
						content: [
							{
								type: "image",
								attrs: { src: "data:image/png;base64,iVBORw0KGgo=" },
							},
						],
					},
				],
			},
			footerContent: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "Rodapé com imagem" }],
					},
					{
						type: "paragraph",
						content: [
							{
								type: "image",
								attrs: { src: "data:image/png;base64,iVBORw0KGgo=" },
							},
						],
					},
				],
			},
			createdAt: new Date(),
			updatedAt: new Date(),
		} as unknown as RenderInput["template"];

		const rendered = renderMinute(baseInput({ template }));
		expect(rendered.elements.some((el) => el.kind === "image")).toBe(true);
	});

	it("usa o conteúdo editável do corpo no lugar dos blocos legados", () => {
		const template = {
			id: "t-body",
			name: "Modelo com corpo",
			headerContent: textDoc("Cabeçalho"),
			bodyContent: textDoc("Corpo personalizado"),
			footerContent: textDoc("Rodapé"),
			showMeeting: true,
			showClasses: true,
			showParticipants: true,
			showRecords: true,
			showGeneralReports: true,
			showSignatures: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as unknown as RenderInput["template"];
		const rendered = renderMinute(
			baseInput({
				template,
				classes: [{ className: "3A" }],
				participants: [{ staffName: "Ana", roleName: "Diretora" }],
				records: [{ className: "3A", studentName: "João", texto: "Bom" }],
				generalReports: [{ texto: "Relato" }],
			}),
		);
		const text = renderedToPlainText(rendered);

		expect(text).toContain("Corpo personalizado");
		expect(text).not.toContain("Data da reunião");
		expect(text).not.toContain("Turmas");
		expect(text).not.toContain("Participantes");
		expect(text).not.toContain("Registros por estudante");
		expect(text).not.toContain("Relatos gerais");
		expect(text).not.toContain("Assinaturas");
	});
});

describe("serializeVersionRow", () => {
	it("serializa versão com pdf presente e ausente", () => {
		const base = {
			id: "v-1",
			minuteId: "min-1",
			version: 2,
			isCurrent: true,
			notes: null,
			createdAt: new Date("2024-04-15T12:00:00Z"),
		};
		const withPdf = serializeVersionRow({
			...base,
			pdf: Buffer.from("pdf"),
		} as Parameters<typeof serializeVersionRow>[0]);
		expect(withPdf.hasPdf).toBe(true);

		const withoutPdf = serializeVersionRow({
			...base,
			pdf: null,
		} as Parameters<typeof serializeVersionRow>[0]);
		expect(withoutPdf.hasPdf).toBe(false);
	});
});
