"use client";

import { cn } from "cn";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Meeting } from "#/lib/meetings/schema";
import { measureDataUriImage } from "#/lib/minutes/measure-image";
import {
	LINE_GAP,
	MARGIN,
	PAGE_W,
	type PaginatedBlock,
	paginateMinute,
} from "#/lib/minutes/paginate";
import { renderMinute } from "#/lib/minutes/render";
import {
	defaultMinuteBodyContent,
	emptyDoc,
} from "#/lib/minutes/tiptap/serializer";

const sampleMeeting = {
	id: "minute-preview-meeting",
	title: "Conselho de Classe — 1º Bimestre",
	status: "open",
	heldAt: new Date("2026-03-15T12:00:00.000Z"),
	location: "Sala dos professores",
	templateId: null,
	createdAt: new Date("2026-03-10T12:00:00.000Z"),
	updatedAt: new Date("2026-03-10T12:00:00.000Z"),
} satisfies Meeting;

const sampleData = {
	classes: [{ className: "9º Ano A" }, { className: "9º Ano B" }],
	participants: [
		{ staffName: "Ana Souza", roleName: "Coordenação" },
		{ staffName: "Bruno Lima", roleName: "Professor" },
	],
	records: [
		{
			className: "9º Ano A",
			studentName: "Carla Dias",
			texto: "Participação ativa nas discussões.",
		},
		{
			className: "9º Ano B",
			studentName: "Diego Alves",
			texto: "Precisa de apoio em matemática.",
		},
	],
	generalReports: [
		{ texto: "A reunião iniciou com a leitura do regimento." },
		{ texto: "Familiares serão convocados para acompanhamento." },
	],
};

/** Arial tem as mesmas métricas da Helvetica do PDF. */
const MINUTE_FONT_FAMILY = 'Helvetica, Arial, "Segoe UI", sans-serif';

/**
 * Preview fiel ao PDF gerado por `buildMinutePdf`: páginas com proporção A4
 * constante (210/297), margens e tipografia proporcionais à largura da folha
 * e paginação idêntica (mesma matemática de `paginateMinute`, que também
 * alimenta o PDF). Cada página vira uma "folha"; o conteúdo nunca estoura a
 * folha — o que não cabe vai para a próxima.
 */
export function MinuteTemplatePreview({
	headerContent,
	bodyContent,
	footerContent,
}: {
	headerContent: Record<string, unknown> | null | undefined;
	bodyContent: Record<string, unknown> | null | undefined;
	footerContent: Record<string, unknown> | null | undefined;
}) {
	const pages = useMemo(() => {
		const rendered = renderMinute({
			meeting: sampleMeeting,
			template: {
				id: "minute-preview-template",
				name: "Preview do modelo",
				headerContent: JSON.stringify(headerContent ?? emptyDoc()),
				bodyContent: JSON.stringify(bodyContent ?? defaultMinuteBodyContent()),
				footerContent: JSON.stringify(footerContent ?? emptyDoc()),
				createdAt: new Date(),
				updatedAt: new Date(),
				showMeeting: true,
				showClasses: true,
				showParticipants: true,
				showRecords: true,
				showGeneralReports: true,
				showSignatures: true,
			},
			classes: sampleData.classes,
			participants: sampleData.participants,
			records: sampleData.records,
			generalReports: sampleData.generalReports,
		});
		return paginateMinute(rendered, {
			measureImage: (src) => measureDataUriImage(src),
		});
	}, [bodyContent, footerContent, headerContent]);

	return (
		<div
			className="flex flex-col items-center gap-4"
			data-slot="minute-template-preview"
		>
			{pages.map((page, index) => (
				<MinutePage key={`page-${index}`} blocks={page.blocks} />
			))}
		</div>
	);
}

/**
 * Escala folha→tela: largura real da folha dividida pela largura A4 em pt.
 * Medida explícita (ResizeObserver) em vez de unidades `cqw`, que caem em
 * fallback para o viewport quando o próprio elemento é o container.
 */
function useMinuteScale() {
	const ref = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		const update = () => {
			setScale(element.clientWidth / PAGE_W || 1);
		};
		update();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(update);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return { ref, scale };
}

function MinutePage({ blocks }: { blocks: PaginatedBlock[] }) {
	const { ref, scale } = useMinuteScale();

	return (
		<div
			ref={ref}
			className="w-full overflow-hidden rounded-sm border bg-card shadow-sm"
			data-slot="minute-page"
			style={{
				aspectRatio: "210 / 297",
				// margens do PDF (56pt) proporcionais à largura da folha
				padding: MARGIN * scale,
				fontFamily: MINUTE_FONT_FAMILY,
			}}
		>
			<div className="h-full w-full text-foreground">
				{blocks.map((block, index) => (
					<MinuteBlock key={`block-${index}`} block={block} scale={scale} />
				))}
			</div>
		</div>
	);
}

function MinuteBlock({
	block,
	scale,
}: {
	block: PaginatedBlock;
	scale: number;
}) {
	if (block.kind === "image") {
		return (
			<img
				src={block.src}
				alt={block.alt}
				style={{
					width: block.width * scale,
					height: block.height * scale,
				}}
			/>
		);
	}

	if (block.kind === "spacer") {
		if (block.dividerAfter) {
			return (
				<hr
					className="border-0 border-t border-border"
					style={{
						// filete de 0.5pt do PDF, proporcional
						borderTopWidth: 0.5 * scale,
					}}
				/>
			);
		}
		return <div style={{ height: block.height * scale }} />;
	}

	// linha de texto: mesma altura de avanço do PDF (size * 1.2 + gap)
	return (
		<p
			className={cn(block.bold && "font-bold")}
			style={{
				fontSize: block.size * scale,
				lineHeight: `${block.size * 1.2 + LINE_GAP * scale}px`,
				marginBottom: block.spacerAfter * scale,
			}}
		>
			{block.text}
		</p>
	);
}
