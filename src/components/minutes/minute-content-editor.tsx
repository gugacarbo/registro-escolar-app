"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { RichTextEditor } from "#/components/ui/rich-text-editor";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormNative,
	FormSubmit,
} from "#/components/ui/form";
import {
	emptyDoc,
	defaultMinuteBodyContent,
} from "#/lib/minutes/tiptap/serializer";
import type { MinuteEditableContentJson } from "#/lib/minutes/types";

const tiptapContentSchema = z.custom<Record<string, unknown>>((value) => {
	if (typeof value !== "object" || value === null) return false;
	return typeof (value as Record<string, unknown>).type === "string";
}, "Conteúdo inválido");

const minuteContentEditorSchema = z.object({
	headerContent: tiptapContentSchema,
	bodyContent: tiptapContentSchema,
	footerContent: tiptapContentSchema,
});

export type MinuteContentEditorValues = z.infer<
	typeof minuteContentEditorSchema
>;

function parseContent(
	value: string | Record<string, unknown> | null | undefined,
	fallback: Record<string, unknown>,
): Record<string, unknown> {
	if (!value) return fallback;
	if (typeof value !== "string") return value;
	try {
		const parsed = JSON.parse(value) as unknown;
		return typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)
			: fallback;
	} catch {
		return fallback;
	}
}

export function MinuteContentEditor({
	initialContent,
	onSubmit,
	submitLabel = "Salvar conteúdo",
	serverError,
	isPending = false,
}: {
	initialContent: MinuteEditableContentJson;
	onSubmit: (values: MinuteContentEditorValues) => void | Promise<void>;
	submitLabel?: string;
	serverError?: string | null;
	isPending?: boolean;
}) {
	const form = useForm<MinuteContentEditorValues>({
		resolver: zodResolver(minuteContentEditorSchema),
		defaultValues: {
			headerContent: parseContent(initialContent.headerContent, emptyDoc()),
			bodyContent: parseContent(
				initialContent.bodyContent,
				defaultMinuteBodyContent(),
			),
			footerContent: parseContent(initialContent.footerContent, emptyDoc()),
		},
	});

	return (
		<Form {...form}>
			<FormNative
				className="space-y-4"
				onSubmit={() => form.handleSubmit(onSubmit)()}
			>
				{initialContent.presetName && (
					<p className="text-sm text-muted-foreground">
						Conteúdo inicial do preset: {initialContent.presetName}
					</p>
				)}
				<FormField
					control={form.control}
					name="headerContent"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Cabeçalho</FormLabel>
							<FormControl>
								<RichTextEditor
									aria-label="Cabeçalho"
									value={field.value}
									onChange={field.onChange}
									placeholder="Cabeçalho da ata..."
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="bodyContent"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Conteúdo</FormLabel>
							<FormControl>
								<RichTextEditor
									aria-label="Conteúdo"
									value={field.value}
									onChange={field.onChange}
									placeholder="Conteúdo principal da ata..."
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="footerContent"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Rodapé</FormLabel>
							<FormControl>
								<RichTextEditor
									aria-label="Rodapé"
									value={field.value}
									onChange={field.onChange}
									placeholder="Rodapé da ata..."
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{serverError && (
					<p role="alert" className="text-sm text-destructive">
						{serverError}
					</p>
				)}
				<FormSubmit disabled={isPending}>
					{isPending ? "Salvando..." : submitLabel}
				</FormSubmit>
			</FormNative>
		</Form>
	);
}
