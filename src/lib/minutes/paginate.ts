import { StandardFontEmbedder, StandardFonts } from "pdf-lib";

import type { RenderedMinute } from "./render";

// Layout compartilhado entre o PDF (pdf.ts) e o preview HTML
// (minute-template-preview.tsx): mesmas métricas, mesma quebra de página —
// o preview é fiel ao que `buildMinutePdf` produz. ADR-0019, revisado pela
// spec 0009; fonte Standard Helvetica (WinAnsi cobre pt-BR básico).

/** A4 em pontos (1 pt = 1/72"). */
export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
export const MARGIN = 56;
export const BODY_SIZE = 10;
export const LINE_GAP = 4;
export const TITLE_SIZE = 16;

/** Fração da largura da página ocupada pelo texto (útil p/ CSS). */
export const CONTENT_WIDTH = PAGE_W - 2 * MARGIN;

export type TextStyle = {
	size: number;
	bold: boolean;
	spacerAfter: number;
};

/** WinAnsi: normaliza caracteres fora do latin1 básico. */
export function sanitizeText(text: string): string {
	return text
		.normalize("NFC")
		.replace(/[‘’]/g, "'")
		.replace(/[“”]/g, '"')
		.replace(/[–—]/g, "-")
		.replace(/…/g, "...")
		.replace(/\t/g, "    ")
		.replace(/[^\x20-\x7E -ÿ]/g, "");
}

/** Estilo tipográfico por nível de linha (espelha buildMinutePdf). */
export function styleFor(level: 1 | 2 | 3): TextStyle {
	if (level === 1) {
		return { size: 13, bold: true, spacerAfter: 6 };
	}
	if (level === 2) {
		return { size: 11, bold: true, spacerAfter: 4 };
	}
	return { size: BODY_SIZE, bold: false, spacerAfter: 2 };
}

/** Altura total ocupada por uma linha impressa. */
export function lineHeightFor(size: number): number {
	return size * 1.2 + LINE_GAP;
}

/** Medidor de largura headless (mesma métrica do PDFFont p/ fontes Standard). */
export type FontLike = {
	widthOfTextAtSize: (text: string, size: number) => number;
};

/** Fontes Standard: inicializadas uma única vez, sob demanda. */
const fonts: {
	regular: FontLike;
	bold: FontLike;
	_regular: FontLike | null;
	_bold: FontLike | null;
} = {
	_regular: null,
	_bold: null,
	get regular(): FontLike {
		this._regular ??= StandardFontEmbedder.for(
			StandardFonts.Helvetica as never,
		) as FontLike;
		return this._regular as FontLike;
	},
	get bold(): FontLike {
		this._bold ??= StandardFontEmbedder.for(
			StandardFonts.HelveticaBold as never,
		) as FontLike;
		return this._bold as FontLike;
	},
};

/**
 * Medidor de largura headless, idêntico ao `PDFFont` do pdf-lib para as
 * fontes Standard (mesma tabela de métricas + kerning).
 */
export function minuteFont(bold: boolean): FontLike {
	return bold ? fonts.bold : fonts.regular;
}

/**
 * Quebra de linha por largura, igual à do PDF: divide em palavras; palavra
 * única maior que a linha sofre quebra dura por caractere.
 */
export function wrap(
	text: string,
	font: FontLike,
	size: number,
	maxWidth: number = CONTENT_WIDTH,
): string[] {
	const words = text.split(/\s+/).filter((w) => w !== "");
	if (words.length === 0) {
		return [""];
	}
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		const candidate = current === "" ? word : `${current} ${word}`;
		if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
			if (current !== "") {
				lines.push(current);
				current = word;
			} else {
				// palavra única maior que a linha: quebra dura por caractere
				let piece = "";
				for (const ch of word) {
					if (
						font.widthOfTextAtSize(piece + ch, size) > maxWidth &&
						piece !== ""
					) {
						lines.push(piece);
						piece = ch;
					} else {
						piece += ch;
					}
				}
				current = piece;
			}
		} else {
			current = candidate;
		}
	}
	if (current !== "") {
		lines.push(current);
	}
	return lines;
}

/** Bloco já posicionado em uma página do preview/PDF. */
export type PaginatedBlock =
	| {
			kind: "line";
			text: string;
			size: number;
			bold: boolean;
			spacerAfter: number;
			/** Linhas de texto repetidas para simular a quebra do PDF. */
			segments: string[];
			/** Filete de 0.5pt sob títulos de seção (nível 2). */
			dividerAfter: boolean;
	  }
	| { kind: "spacer"; height: number; dividerAfter: boolean }
	| {
			kind: "image";
			src: string;
			alt: string;
			width: number;
			height: number;
	  };

export type PaginatedPage = {
	blocks: PaginatedBlock[];
};

export type ImageMeasure = (
	src: string,
	alt: string,
) => {
	width: number;
	height: number;
} | null;

export type PaginateMinuteOptions = {
	/**
	 * Mede imagem data-URI (png/jpeg) em pt já escalada para a largura de
	 * conteúdo. Não fornecido: imagem vira linha de texto `[imagem: alt]`,
	 * como o fallback do PDF.
	 */
	measureImage?: ImageMeasure;
	/** Inclui o "Gerada em ..." do PDF (preview não usa). */
	generatedAt?: string;
};

/** Escala imagem (pt) para caber na largura de conteúdo, como no PDF. */
export function fitImage(
	width: number,
	height: number,
): { width: number; height: number } {
	const scale = Math.min(1, CONTENT_WIDTH / width);
	return { width: width * scale, height: height * scale };
}

/**
 * Reproduz a paginação de `buildMinutePdf`: mesma ordem de escrita, mesma
 * altura de linha (size*1.2 + LINE_GAP), mesmo espaçador após cada linha,
 * mesma regra de quebra (`ensureSpace`), filete sob seções de nível 2 e
 * imagens escaladas para a largura de conteúdo.
 */
export function paginateMinute(
	rendered: RenderedMinute,
	options: PaginateMinuteOptions = {},
): PaginatedPage[] {
	const pages: PaginatedPage[] = [{ blocks: [] }];
	let cursorY = PAGE_H - MARGIN;

	const ensureSpace = (needed: number) => {
		if (cursorY - needed < MARGIN) {
			pages.push({ blocks: [] });
			cursorY = PAGE_H - MARGIN;
		}
	};

	const writeLine = (
		text: string,
		font: FontLike,
		size: number,
		spacerAfter: number,
	) => {
		const pieces = wrap(sanitizeText(text), font, size);
		for (const piece of pieces) {
			const lineHeight = lineHeightFor(size);
			ensureSpace(lineHeight);
			if (piece !== "") {
				pages[pages.length - 1].blocks.push({
					kind: "line",
					text: piece,
					size,
					bold: font === minuteFont(true),
					spacerAfter: 0,
					segments: [piece],
					dividerAfter: false,
				});
			}
			cursorY -= lineHeight;
		}
		cursorY -= spacerAfter;
	};
	// Título do documento
	writeLine(rendered.title, minuteFont(true), TITLE_SIZE, 2);
	if (options.generatedAt) {
		writeLine(
			`Gerada em ${new Date(options.generatedAt).toLocaleString("pt-BR")}`,
			minuteFont(false),
			8,
			8,
		);
	}

	for (const element of rendered.elements) {
		if (element.kind === "image") {
			const measured = options.measureImage?.(element.src, element.alt);
			if (measured === null || measured === undefined) {
				writeLine(`[imagem: ${element.alt}]`, minuteFont(false), BODY_SIZE, 2);
				continue;
			}
			ensureSpace(measured.height + 4);
			pages[pages.length - 1].blocks.push({
				kind: "image",
				src: element.src,
				alt: element.alt,
				width: measured.width,
				height: measured.height,
			});
			cursorY -= measured.height + 4;
			continue;
		}
		const style = styleFor(element.level);
		writeLine(
			element.text,
			minuteFont(style.bold),
			style.size,
			style.spacerAfter,
		);
		if (element.level === 2) {
			// filete sob títulos de seção
			ensureSpace(8);
			pages[pages.length - 1].blocks.push({
				kind: "spacer",
				height: 0,
				dividerAfter: true,
			});
		}
	}

	return pages;
}
