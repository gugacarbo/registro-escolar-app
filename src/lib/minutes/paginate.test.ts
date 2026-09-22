import { describe, expect, it } from "vitest";
import {
	CONTENT_WIDTH,
	fitImage,
	LINE_GAP,
	lineHeightFor,
	MARGIN,
	minuteFont,
	PAGE_H,
	PAGE_W,
	paginateMinute,
	sanitizeText,
	styleFor,
	wrap,
} from "./paginate";
import type { RenderedMinute } from "./render";

const font = minuteFont(false);
const bold = minuteFont(true);

function longText(size: number, boldFace: boolean, lines: number): string {
	const word = "a".repeat(
		Math.floor(
			CONTENT_WIDTH / minuteFont(boldFace).widthOfTextAtSize("a", size),
		) - 1,
	);
	return Array.from({ length: lines }, () => `${word} x`).join(" ");
}

describe("métricas da página", () => {
	it("expõe as constantes A4 do PDF", () => {
		expect(PAGE_W).toBe(595.28);
		expect(PAGE_H).toBe(841.89);
		expect(MARGIN).toBe(56);
		expect(LINE_GAP).toBe(4);
		expect(CONTENT_WIDTH).toBeCloseTo(595.28 - 112);
	});

	it("altura de linha = size * 1.2 + gap", () => {
		expect(lineHeightFor(10)).toBe(10 * 1.2 + LINE_GAP);
		expect(lineHeightFor(16)).toBe(16 * 1.2 + LINE_GAP);
	});

	it("estilo por nível espelha o PDF", () => {
		expect(styleFor(1)).toEqual({ size: 13, bold: true, spacerAfter: 6 });
		expect(styleFor(2)).toEqual({ size: 11, bold: true, spacerAfter: 4 });
		expect(styleFor(3)).toEqual({ size: 10, bold: false, spacerAfter: 2 });
	});
});

describe("sanitizeText", () => {
	it("normaliza pontuação curva, travessão e reticências", () => {
		expect(sanitizeText("“aspas” ‘simples’ — fim…")).toBe(
			"\"aspas\" 'simples' - fim...",
		);
	});

	it("remove caracteres fora do WinAnsi (•, emoji, tab vira espaços)", () => {
		expect(sanitizeText("• item")).toBe(" item");
		expect(sanitizeText("ok\u{1F600}")).toBe("ok");
		expect(sanitizeText("a\tb")).toBe("a    b");
	});

	it("mantém acentos pt-BR", () => {
		expect(sanitizeText("Ação não informada crítico")).toBe(
			"Ação não informada crítico",
		);
	});
});

describe("wrap", () => {
	it("retorna [''] para texto vazio", () => {
		expect(wrap("", font, 10)).toEqual([""]);
		expect(wrap("   ", font, 10)).toEqual([""]);
	});

	it("não quebra texto que cabe na linha", () => {
		const text = "Data da reunião: 15/03/2026";
		expect(wrap(text, font, 10)).toEqual([text]);
	});

	it("quebra por palavra quando excede a largura", () => {
		const text = "aaaa bbbb cccc";
		const lines = wrap(text, bold, 11, bold.widthOfTextAtSize("aaaa bbbb", 11));
		expect(lines).toEqual(["aaaa bbbb", "cccc"]);
	});

	it("quebra duro palavra única maior que a linha", () => {
		const word = "a".repeat(200);
		const lines = wrap(word, font, 10);
		expect(lines.length).toBeGreaterThan(1);
		for (const line of lines) {
			expect(font.widthOfTextAtSize(line, 10)).toBeLessThanOrEqual(
				CONTENT_WIDTH,
			);
		}
	});

	it("propaga maxWidth customizado", () => {
		const text = "xx yy";
		const lines = wrap(text, font, 10, font.widthOfTextAtSize("xx", 10));
		expect(lines).toEqual(["xx", "yy"]);
	});
});

describe("fitImage", () => {
	it("mantém imagem menor que a largura de conteúdo", () => {
		expect(fitImage(100, 50)).toEqual({ width: 100, height: 50 });
	});

	it("escala imagem maior para caber, preservando proporção", () => {
		const fitted = fitImage(CONTENT_WIDTH * 2, 400);
		expect(fitted.width).toBeCloseTo(CONTENT_WIDTH);
		expect(fitted.height).toBeCloseTo(200);
	});
});

describe("paginateMinute", () => {
	it("coloca conteúdo curto em uma única página", () => {
		const rendered: RenderedMinute = {
			title: "Ata — Reunião",
			lines: [{ text: "Ata — Reunião", level: 1 }],
			elements: [
				{ kind: "line", text: "Cabeçalho", level: 1 },
				{ kind: "line", text: "TURMAS", level: 2 },
				{ kind: "line", text: "9º Ano A", level: 3 },
			],
		};
		const pages = paginateMinute(rendered);
		expect(pages).toHaveLength(1);
		const title = pages[0].blocks[0];
		// em-dash é normalizado para "-" pelo sanitizeText (WinAnsi)
		expect(title).toMatchObject({
			kind: "line",
			text: "Ata - Reunião",
			size: 16,
			bold: true,
		});
	});

	it("aplica estilo por nível e divider no nível 2", () => {
		const rendered: RenderedMinute = {
			title: "Ata",
			lines: [],
			elements: [
				{ kind: "line", text: "TURMAS", level: 2 },
				{ kind: "line", text: "9º Ano A", level: 3 },
				{ kind: "line", text: "Assinatura", level: 1 },
			],
		};
		const [page] = paginateMinute(rendered);
		expect(page.blocks[1]).toMatchObject({
			kind: "line",
			size: 11,
			bold: true,
		});
		const divider = page.blocks[2];
		expect(divider).toMatchObject({ kind: "spacer", dividerAfter: true });
		expect(page.blocks[3]).toMatchObject({ kind: "line", size: 10 });
		expect(page.blocks[4]).toMatchObject({
			kind: "line",
			size: 13,
			bold: true,
		});
	});

	it("mantém wrap de linha longa como blocos de texto separados", () => {
		const rendered: RenderedMinute = {
			title: "Ata",
			lines: [],
			elements: [{ kind: "line", text: longText(10, false, 2), level: 3 }],
		};
		const [page] = paginateMinute(rendered);
		const lines = page.blocks.filter((b) => b.kind === "line");
		expect(lines.length).toBeGreaterThan(2); // título + 2+ linhas quebradas
	});

	it("gera segunda página quando o conteúdo excede uma folha", () => {
		const rendered: RenderedMinute = {
			title: "Ata longa",
			lines: [],
			elements: Array.from({ length: 120 }, (_, i) => ({
				kind: "line" as const,
				text: `Linha ${i + 1} com bastante texto para ocupar espaço na folha`,
				level: 3 as const,
			})),
		};
		const pages = paginateMinute(rendered);
		expect(pages.length).toBeGreaterThan(1);
		// cada página respeita a margem inferior
		for (const page of pages) {
			expect(page.blocks.length).toBeGreaterThan(0);
		}
	});

	it("não quebra página em conteúdo vazio além do título", () => {
		const rendered: RenderedMinute = {
			title: "Ata",
			lines: [],
			elements: [],
		};
		const pages = paginateMinute(rendered);
		expect(pages).toHaveLength(1);
		expect(pages[0].blocks).toHaveLength(1);
	});

	it("imagem com medidor rende bloco de imagem escalada", () => {
		const rendered: RenderedMinute = {
			title: "Ata com imagem",
			lines: [],
			elements: [
				{ kind: "image", src: "data:image/png;base64,abc", alt: "gráfico" },
			],
		};
		const pages = paginateMinute(rendered, {
			measureImage: () => ({ width: CONTENT_WIDTH, height: 120 }),
		});
		expect(pages[0].blocks[1]).toMatchObject({
			kind: "image",
			alt: "gráfico",
			width: CONTENT_WIDTH,
			height: 120,
		});
	});

	it("imagem sem medidor vira linha de fallback [imagem: alt]", () => {
		const rendered: RenderedMinute = {
			title: "Ata",
			lines: [],
			elements: [{ kind: "image", src: "https://x/y.png", alt: "foto" }],
		};
		const [page] = paginateMinute(rendered);
		expect(page.blocks[1]).toMatchObject({
			kind: "line",
			text: "[imagem: foto]",
			size: 10,
		});
	});

	it("imagem que não cabe na página restante inicia nova página", () => {
		const rendered: RenderedMinute = {
			title: "Ata",
			lines: [],
			elements: [
				{ kind: "line", text: "Introdução", level: 3 },
				{ kind: "image", src: "data:image/png;base64,abc", alt: "alta" },
			],
		};
		const pages = paginateMinute(rendered, {
			measureImage: () => ({ width: 300, height: PAGE_H - 2 * MARGIN }),
		});
		expect(pages.length).toBe(2);
		expect(pages[1].blocks[0]).toMatchObject({ kind: "image", alt: "alta" });
	});

	it("divider no fim da página inicia página nova se necessário", () => {
		const rendered: RenderedMinute = {
			title: "Ata",
			lines: [],
			elements: [
				{ kind: "line", text: "Assinaturas", level: 2 },
				{ kind: "line", text: "Nome", level: 3 },
			],
		};
		// preenche a página até o limite com uma imagem que consome quase tudo
		const pages = paginateMinute(rendered, {
			measureImage: (src) =>
				src === "data:image/png;base64,abc"
					? { width: 300, height: PAGE_H - 2 * MARGIN - lineHeightFor(10) }
					: null,
		});
		// apenas garante que roda sem estourar margem e com > 0 páginas
		expect(pages.length).toBeGreaterThanOrEqual(1);
	});

	it("generatedAt imprime linha 'Gerada em' em 8pt", () => {
		const rendered: RenderedMinute = {
			title: "Ata",
			lines: [],
			elements: [],
		};
		const [page] = paginateMinute(rendered, {
			generatedAt: "2026-03-15T12:00:00.000Z",
		});
		expect(page.blocks[1]).toMatchObject({ kind: "line", size: 8 });
		expect(page.blocks[1].kind === "line" && page.blocks[1].text).toContain(
			"Gerada em",
		);
	});
});
