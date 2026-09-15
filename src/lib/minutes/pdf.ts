import { PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";

import type { RenderedMinute } from "./render";

// Gerador de PDF com pdf-lib (ADR-0019 revisado pela spec 0009): fontes
// Standard Helvetica (WinAnsi cobre pt-BR básico), A4, paginação automática.

const PAGE_W = 595.28; // A4 em pontos
const PAGE_H = 841.89;
const MARGIN = 56;
const BODY_SIZE = 10;
const LINE_GAP = 4;

/** WinAnsi: normaliza caracteres fora do latin1 básico. */
function sanitizeText(text: string): string {
	return text
		.normalize("NFC")
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/[\u2013\u2014]/g, "-")
		.replace(/\u2026/g, "...")
		.replace(/\t/g, "    ")
		.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");
}

type Style = {
	size: number;
	bold: boolean;
	spacerAfter: number;
};

function styleFor(level: 1 | 2 | 3): Style {
	if (level === 1) {
		return { size: 13, bold: true, spacerAfter: 6 };
	}
	if (level === 2) {
		return { size: 11, bold: true, spacerAfter: 4 };
	}
	return { size: BODY_SIZE, bold: false, spacerAfter: 2 };
}

export type BuildMinutePdfOptions = {
	/** Título do documento (fallback: rendered.title). */
	title?: string;
	/** Data de geração impressa no cabeçalho (ISO). */
	generatedAt?: string;
};

/** Gera os bytes do PDF (Uint8Array) a partir da ata renderizada. */
export async function buildMinutePdf(
	rendered: RenderedMinute,
	options: BuildMinutePdfOptions = {},
): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	doc.setTitle(sanitizeText(options.title ?? rendered.title), {
		showInWindowTitleBar: true,
	});
	doc.setProducer("registro-escolar-app");
	doc.setCreator("registro-escolar-app");

	const regular = await doc.embedFont(StandardFonts.Helvetica);
	const bold = await doc.embedFont(StandardFonts.HelveticaBold);

	let page = doc.addPage([PAGE_W, PAGE_H]);
	let cursorY = PAGE_H - MARGIN;

	const ensureSpace = (needed: number) => {
		if (cursorY - needed < MARGIN) {
			page = doc.addPage([PAGE_W, PAGE_H]);
			cursorY = PAGE_H - MARGIN;
		}
	};

	const wrap = (text: string, font: PDFFont, size: number): string[] => {
		const maxWidth = PAGE_W - 2 * MARGIN;
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
	};

	const writeLine = (
		text: string,
		font: PDFFont,
		size: number,
		spacerAfter: number,
	) => {
		for (const piece of wrap(sanitizeText(text), font, size)) {
			const lineHeight = size * 1.2 + LINE_GAP;
			ensureSpace(lineHeight);
			if (piece !== "") {
				page.drawText(piece, {
					x: MARGIN,
					y: cursorY - size,
					size,
					font,
					color: rgb(0.1, 0.1, 0.12),
				});
			}
			cursorY -= lineHeight;
		}
		cursorY -= spacerAfter;
	};

	const writeImage = async (src: string, alt: string) => {
		const parsed = src.match(/^data:image\/(\w+);base64,(.+)$/);
		if (!parsed) {
			writeLine(`[imagem: ${alt}]`, regular, BODY_SIZE, 2);
			return;
		}
		const [, mime, base64] = parsed;
		try {
			const bytes = Buffer.from(base64, "base64");
			const embed =
				mime === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
			const maxWidth = PAGE_W - 2 * MARGIN;
			const scale = Math.min(1, maxWidth / embed.width);
			const width = embed.width * scale;
			const height = embed.height * scale;
			ensureSpace(height + 4);
			page.drawImage(embed, {
				x: MARGIN,
				y: cursorY - height,
				width,
				height,
			});
			cursorY -= height + 4;
		} catch {
			writeLine(`[imagem: ${alt}]`, regular, BODY_SIZE, 2);
		}
	};

	// Título do documento
	writeLine(rendered.title, bold, 16, 2);
	if (options.generatedAt) {
		writeLine(
			`Gerada em ${new Date(options.generatedAt).toLocaleString("pt-BR")}`,
			regular,
			8,
			8,
		);
	}

	for (const element of rendered.elements) {
		if (element.kind === "image") {
			await writeImage(element.src, element.alt);
			continue;
		}
		const style = styleFor(element.level);
		writeLine(
			element.text,
			style.bold ? bold : regular,
			style.size,
			style.spacerAfter,
		);
		if (element.level === 2) {
			// filete sob títulos de seção
			ensureSpace(8);
			page.drawLine({
				start: { x: MARGIN, y: cursorY + 4 },
				end: { x: PAGE_W - MARGIN, y: cursorY + 4 },
				thickness: 0.5,
				color: rgb(0.75, 0.75, 0.78),
			});
		}
	}

	return doc.save();
}

/** Utilitário para testes/rotas: bytes como Buffer para o BLOB do D1. */
export function pdfBytesToBuffer(bytes: Uint8Array): Buffer {
	return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
