import type { JSONContent } from "@tiptap/core";
import type { MDBMeeting } from "../render";
import type { MinuteDataInput } from "../repository";
import {
	PLACEHOLDER_NODE_NAME,
	type PlaceholderType,
} from "./placeholder-node";

export type TextNode = { kind: "text"; text: string; bold?: boolean };
export type ImageNode = {
	kind: "image";
	src: string;
	alt: string;
};
export type MinuteElement = TextNode | ImageNode;

export type RenderContext = {
	meeting: MDBMeeting;
	data: MinuteDataInput;
};

/**
 * Cria um documento TipTap vazio.
 */
export function emptyDoc(): JSONContent {
	return { type: "doc", content: [{ type: "paragraph" }] };
}

/**
 * Cria um documento TipTap simples com um parágrafo de texto.
 */
export function textDoc(text: string): JSONContent {
	return {
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: text ? [{ type: "text", text }] : undefined,
			},
		],
	};
}

function isEmptyDoc(doc: JSONContent | null | undefined): boolean {
	if (!doc?.content) {
		return true;
	}
	return doc.content.every(
		(node) =>
			node.type === "paragraph" && (!node.content || node.content.length === 0),
	);
}

function collectText(nodes: JSONContent[], context: RenderContext): string {
	return nodes
		.map((node) => {
			if (node.type === "text") {
				return String(node.text ?? "");
			}
			if (node.type === PLACEHOLDER_NODE_NAME) {
				const type = node.attrs?.["data-type"] as PlaceholderType;
				return resolvePlaceholderText(type, context) ?? "";
			}
			if (node.type === "hardBreak") {
				return "\n";
			}
			if (node.type === "image") {
				return "";
			}
			if (node.content) {
				return collectText(node.content, context);
			}
			return "";
		})
		.join("");
}

function resolvePlaceholderText(
	type: PlaceholderType | undefined,
	context: RenderContext,
): string | null {
	if (!type) return null;
	switch (type) {
		case "meeting-title":
			return context.meeting.title;
		case "meeting-date": {
			const held = context.meeting.heldAt;
			return held
				? new Date(held).toLocaleDateString("pt-BR")
				: "data não informada";
		}
		case "meeting-location":
			return (
				(context.meeting as { location?: string | null }).location ??
				"local não informado"
			);
		case "school-name":
			return "Escola"; // placeholder genérico até termos configuração da escola
		case "classes-list":
			return context.data.classes.map((c) => `• ${c.className}`).join("\n");
		case "participants-list":
			return context.data.participants
				.map((p) => `• ${p.staffName} — ${p.roleName}`)
				.join("\n");
		case "records-list":
			return context.data.records
				.map(
					(r) =>
						`• ${r.studentName}${r.className ? ` (${r.className})` : ""}: ${r.texto}`,
				)
				.join("\n");
		case "general-reports-list":
			return context.data.generalReports.map((g) => `• ${g.texto}`).join("\n");
		case "signatures-list":
			return context.data.participants
				.map((p) => `${p.staffName}\n_____________________________`)
				.join("\n\n");
		default:
			return null;
	}
}

/**
 * Converte um documento TipTap em texto plano resolvendo placeholders.
 * Usado para o campo `content` da versão da ata.
 */
export function tipTapToPlainText(
	doc: JSONContent | null | undefined,
	context?: RenderContext,
): string {
	if (isEmptyDoc(doc)) {
		return "";
	}
	const ctx = context ?? ({} as RenderContext);
	return (doc?.content ?? [])
		.map((node) => {
			if (node.type === "paragraph") {
				return collectText(node.content ?? [], ctx);
			}
			if (node.type?.startsWith("heading")) {
				return collectText(node.content ?? [], ctx).toUpperCase();
			}
			return collectText([node], ctx);
		})
		.filter((line) => line.trim() !== "")
		.join("\n");
}

function collectElements(
	nodes: JSONContent[],
	context: RenderContext,
	acc: MinuteElement[] = [],
): MinuteElement[] {
	for (const node of nodes) {
		if (node.type === "text") {
			if (node.text) {
				acc.push({
					kind: "text",
					text: String(node.text),
					bold: !!node.marks?.some((m) => m.type === "bold"),
				});
			}
		} else if (node.type === PLACEHOLDER_NODE_NAME) {
			const type = node.attrs?.["data-type"] as PlaceholderType;
			const text = resolvePlaceholderText(type, context) ?? "";
			if (text) {
				acc.push({ kind: "text", text });
			}
		} else if (node.type === "image") {
			const src = node.attrs?.src as string;
			const alt = node.attrs?.alt as string;
			if (src) {
				acc.push({ kind: "image", src, alt: alt ?? "" });
			}
		} else if (node.type === "hardBreak") {
			acc.push({ kind: "text", text: "\n" });
		} else if (node.content) {
			collectElements(node.content, context, acc);
		}
	}
	return acc;
}

/**
 * Converte um documento TipTap em uma lista de elementos (texto/imagem)
 * já com placeholders resolvidos, pronta para renderização em PDF.
 */
export function tipTapToMinuteElements(
	doc: JSONContent | null | undefined,
	context: RenderContext,
): MinuteElement[] {
	if (isEmptyDoc(doc)) {
		return [];
	}
	return collectElements(doc?.content ?? [], context);
}

export function plainTextToTipTap(text: string): JSONContent {
	if (!text) {
		return emptyDoc();
	}
	return {
		type: "doc",
		content: text.split("\n").map((line) => ({
			type: "paragraph",
			content: line ? [{ type: "text", text: line }] : undefined,
		})),
	};
}
