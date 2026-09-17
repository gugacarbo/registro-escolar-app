"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { Input } from "#/components/ui/input";
import { RichTextEditor } from "#/components/ui/rich-text-editor";
import {
	defaultMinuteBodyContent,
	emptyDoc,
} from "#/lib/minutes/tiptap/serializer";

const tiptapContentSchema = z.custom<Record<string, unknown>>((val) => {
	if (typeof val !== "object" || val === null) return false;
	const record = val as Record<string, unknown>;
	return typeof record.type === "string";
}, "Conteúdo inválido");

const minuteTemplateFormSchema = z.object({
	name: z.string().trim().min(1, "Nome é obrigatório"),
	headerContent: tiptapContentSchema,
	bodyContent: tiptapContentSchema,
	footerContent: tiptapContentSchema,
});

export type MinuteTemplateFormValues = z.infer<typeof minuteTemplateFormSchema>;

export function MinuteTemplateForm({
	onSubmit,
	submitLabel = "Salvar",
	serverError,
	defaultValues,
}: {
	onSubmit: (values: MinuteTemplateFormValues) => void | Promise<void>;
	submitLabel?: string;
	serverError?: string | null;
	defaultValues?: MinuteTemplateFormValues;
}) {
	const form = useForm<MinuteTemplateFormValues>({
		resolver: zodResolver(minuteTemplateFormSchema),
		defaultValues: defaultValues ?? {
			name: "",
			headerContent: emptyDoc() as Record<string, unknown>,
			bodyContent: defaultMinuteBodyContent() as Record<string, unknown>,
			footerContent: emptyDoc() as Record<string, unknown>,
		},
	});

	return (
		<Form {...form}>
			<FormNative
				onSubmit={() => form.handleSubmit(onSubmit)()}
				className="space-y-4"
			>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Nome *</FormLabel>
							<FormControl>
								<Input {...field} placeholder="Modelo padrão" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="headerContent"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Cabeçalho</FormLabel>
							<FormControl>
								<RichTextEditor
									aria-label="Cabeçalho"
									value={field.value as Record<string, unknown>}
									onChange={field.onChange}
									placeholder="Cabeçalho do template..."
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
									value={field.value as Record<string, unknown>}
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
									value={field.value as Record<string, unknown>}
									onChange={field.onChange}
									placeholder="Rodapé do template..."
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{serverError && (
					<p className="text-sm text-destructive">{serverError}</p>
				)}
				<FormSubmit>{submitLabel}</FormSubmit>
			</FormNative>
		</Form>
	);
}
