import { describe, expect, it } from "vitest";
import {
	imageFileToInlineBase64,
	isAllowedImageType,
	parseDataUrl,
} from "./image-utils";
import {
	defaultMinuteBodyContent,
	emptyDoc,
	plainTextToTipTap,
	type RenderContext,
	textDoc,
	tipTapToMinuteElements,
	tipTapToPlainText,
} from "./serializer";

describe("TipTap serializer & utils", () => {
	const timestamp = 1713139200000; // 15/04/2024
	const mockContext = {
		meeting: {
			id: "m-1",
			title: "Conselho de Classe 3º Ano",
			heldAt: new Date(timestamp),
			location: "Sala dos Professores",
			templateId: null,
			status: "draft" as const,
			createdAt: new Date(timestamp),
			updatedAt: new Date(timestamp),
		},
		data: {
			classes: [{ classId: "c-1", className: "Turma 3A" }],
			participants: [
				{
					staffId: "s-1",
					staffName: "Maria Silva",
					roleName: "Coordenadora",
				},
			],
			records: [
				{
					id: "r-1",
					meetingId: "m-1",
					studentId: "st-1",
					studentName: "João Santos",
					className: "Turma 3A",
					category: "pedagógico",
					texto: "Bom desempenho",
					createdAt: 1713139200000,
					updatedAt: 1713139200000,
				},
			],
			generalReports: [
				{
					id: "g-1",
					meetingId: "m-1",
					authorStaffId: "s-1",
					texto: "Reunião iniciada às 14h.",
					createdAt: 1713139200000,
					updatedAt: 1713139200000,
				},
			],
		},
	};

	it("cria documentos vazios e de texto simples", () => {
		expect(emptyDoc()).toEqual({
			type: "doc",
			content: [{ type: "paragraph" }],
		});

		const doc = textDoc("Olá Mundo");
		expect(doc.type).toBe("doc");
		expect(doc.content?.[0].content?.[0].text).toBe("Olá Mundo");

		expect(plainTextToTipTap("")).toEqual(emptyDoc());
		const multiLine = plainTextToTipTap("Linha 1\nLinha 2");
		expect(multiLine.content?.length).toBe(2);
		const trailingEmptyLine = plainTextToTipTap("Linha 1\n");
		expect(trailingEmptyLine.content?.[1]?.content).toBeUndefined();
	});

	it("cria o corpo padrão com todas as seções e respeita as flags", () => {
		const defaultBody = defaultMinuteBodyContent();
		expect(defaultBody.content).toHaveLength(11);
		expect(defaultBody.content?.map((node) => node.type)).toEqual([
			"paragraph",
			"heading",
			"paragraph",
			"heading",
			"paragraph",
			"heading",
			"paragraph",
			"heading",
			"paragraph",
			"heading",
			"paragraph",
		]);

		const hiddenBody = defaultMinuteBodyContent({
			showMeeting: false,
			showClasses: false,
			showParticipants: false,
			showRecords: false,
			showGeneralReports: false,
			showSignatures: false,
		});
		expect(hiddenBody.content).toEqual([]);
	});

	it("converte TipTap para texto plano e resolve placeholders", () => {
		expect(tipTapToPlainText(null)).toBe("");
		expect(tipTapToPlainText(emptyDoc())).toBe("");
		expect(tipTapToPlainText(textDoc("olá"), undefined)).toBe("olá");
		expect(tipTapToMinuteElements(undefined, undefined as never)).toEqual([]);
		expect(tipTapToMinuteElements(emptyDoc(), undefined as never)).toEqual([]);

		// nós especiais dentro de parágrafo: hardBreak, imagem, nó sem conteúdo
		const mixed = tipTapToPlainText(
			{
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{ type: "text", text: "a" },
							{ type: "hardBreak" },
							{ type: "text", text: "b" },
							{ type: "image", attrs: { src: "data:image/png;base64,QQ==" } },
							{ type: "unknownNode" },
						],
					},
				],
			},
			mockContext,
		);
		expect(mixed).toContain("a\nb");

		const missingText = tipTapToPlainText(
			{
				type: "doc",
				content: [{ type: "paragraph", content: [{ type: "text" }] }],
			},
			mockContext,
		);
		expect(missingText).toBe("");

		const emptyBlocks = tipTapToPlainText(
			{
				type: "doc",
				content: [{ type: "paragraph" }, { type: "heading" }],
			},
			mockContext,
		);
		expect(emptyBlocks).toBe("");

		// placeholder sem tipo (attrs ausentes) não quebra
		const noType = tipTapToPlainText(
			{
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "minutePlaceholder" }],
					},
				],
			},
			mockContext,
		);
		expect(noType).toBe("");

		const doc = {
			type: "doc",
			content: [
				{
					type: "heading",
					attrs: { level: 1 },
					content: [{ type: "text", text: "Ata da Reunião" }],
				},
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Título: " },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "meeting-title" },
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Data: " },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "meeting-date" },
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Local: " },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "meeting-location" },
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "school-name" },
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "classes-list" },
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "participants-list" },
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "records-list" },
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "general-reports-list" },
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "signatures-list" },
						},
					],
				},
			],
		};

		const plainText = tipTapToPlainText(doc, mockContext);
		expect(plainText).toContain("ATA DA REUNIÃO");
		expect(plainText).toContain("Conselho de Classe 3º Ano");
		expect(plainText).toContain("Sala dos Professores");
		expect(plainText).toContain("Turma 3A");
		expect(plainText).toContain("Maria Silva — Coordenadora");
		expect(plainText).toContain("João Santos (Turma 3A): Bom desempenho");
		expect(plainText).toContain("Reunião iniciada às 14h.");
		expect(plainText).toContain("Maria Silva\n_____________________________");
	});

	it("lida com fallbacks de placeholders e nós aninhados desconhecidos no plainText", () => {
		const fallbackContext: RenderContext = {
			meeting: {
				id: "m-2",
				title: "Reunião Sem Local e Data",
				heldAt: null as never,
				location: null as never,
				templateId: null,
				status: "draft" as const,
				createdAt: new Date(timestamp),
				updatedAt: new Date(timestamp),
			},
			data: {
				classes: [],
				participants: [],
				records: [
					{
						studentName: "Aluno Sem Turma",
						className: null,
						texto: "Observação sem turma",
					},
				],
				generalReports: [],
			},
		};

		const doc = {
			type: "doc",
			content: [
				{
					type: "blockquote",
					content: [
						{ type: "text", text: "Citação: " },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "meeting-date" },
						},
						{ type: "text", text: " em " },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "meeting-location" },
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "records-list" },
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "placeholder-inexistente" },
						},
					],
				},
			],
		};

		const text = tipTapToPlainText(doc, fallbackContext);
		expect(text).toContain("data não informada");
		expect(text).toContain("local não informado");
		expect(text).toContain("Aluno Sem Turma: Observação sem turma");
	});

	it("resolve placeholders sem contexto e com dados variados", () => {
		const doc = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "school-name" },
						},
						{ type: "text", text: " " },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "classes-list" },
						},
						{ type: "text", text: " " },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "participants-list" },
						},
						{ type: "text", text: " " },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "records-list" },
						},
						{ type: "text", text: " " },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "general-reports-list" },
						},
						{ type: "text", text: " " },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "signatures-list" },
						},
						{ type: "text", text: " " },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "unknown-type" },
						},
					],
				},
			],
		};
		const text = tipTapToPlainText(doc, mockContext);
		expect(text).toContain("Escola");
		expect(text).toContain("Turma 3A");
		expect(text).toContain("Maria Silva");
		expect(text).toContain("João Santos");
		expect(text).toContain("Reunião iniciada às 14h.");
		expect(text).toContain("_____________________________");
	});

	it("converte TipTap para elementos do PDF (texto e imagem)", () => {
		expect(tipTapToMinuteElements(null, mockContext)).toEqual([]);

		const doc = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Negrito",
							marks: [{ type: "bold" }],
						},
						{ type: "hardBreak" },
						{
							type: "minutePlaceholder",
							attrs: { "data-type": "meeting-title" },
						},
						{
							type: "image",
							attrs: {
								src: "data:image/png;base64,iVBORw0KGgoAAA==",
								alt: "Logo",
							},
						},
					],
				},
			],
		};

		const elements = tipTapToMinuteElements(doc, mockContext);
		expect(elements).toEqual([
			{ kind: "text", text: "Negrito", bold: true },
			{ kind: "text", text: "\n" },
			{ kind: "text", text: "Conselho de Classe 3º Ano" },
			{
				kind: "image",
				src: "data:image/png;base64,iVBORw0KGgoAAA==",
				alt: "Logo",
			},
		]);

		const unknownPlaceholder = tipTapToMinuteElements(
			{
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "minutePlaceholder",
								attrs: { "data-type": "placeholder-inexistente" },
							},
						],
					},
				],
			},
			mockContext,
		);
		expect(unknownPlaceholder).toEqual([]);
	});

	it("image-utils valida formatos, lê base64 e faz parse da data URL", async () => {
		const validFile = new File(["dummy content"], "foto.png", {
			type: "image/png",
		});
		expect(isAllowedImageType(validFile)).toBe(true);

		const invalidFile = new File(["dummy content"], "relatorio.pdf", {
			type: "application/pdf",
		});
		expect(isAllowedImageType(invalidFile)).toBe(false);

		const invalidResult = await imageFileToInlineBase64(invalidFile);
		expect(invalidResult.error).toContain("Formato não suportado");

		const bigFile = new File([new Uint8Array(2 * 1024 * 1024)], "foto.png", {
			type: "image/png",
		});
		const bigResult = await imageFileToInlineBase64(bigFile, {
			maxSize: 1024 * 1024,
		});
		expect(bigResult.error).toContain("Imagem muito grande");

		const parsed = parseDataUrl("data:image/png;base64,ABCDEF==");
		expect(parsed).toEqual({ mime: "image/png", base64: "ABCDEF==" });
		expect(parseDataUrl("invalido")).toBeNull();
	});
});
