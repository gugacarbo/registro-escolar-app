"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Checkbox } from "#/components/ui/checkbox";
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
import { emptyDoc } from "#/lib/minutes/tiptap/serializer";

const BLOCKS = [
	{ name: "showMeeting", label: "Reunião" },
	{ name: "showClasses", label: "Turmas" },
	{ name: "showParticipants", label: "Participantes" },
	{ name: "showRecords", label: "Registros por estudante" },
	{ name: "showGeneralReports", label: "Relatos gerais" },
	{ name: "showSignatures", label: "Assinaturas" },
] as const;

const tiptapContentSchema = z.custom<Record<string, unknown>>((val) => {
	if (typeof val !== "object" || val === null) return false;
	const record = val as Record<string, unknown>;
	return typeof record.type === "string";
}, "Conteúdo inválido");

const minuteTemplateFormSchema = z.object({
	name: z.string().trim().min(1, "Nome é obrigatório"),
	headerContent: tiptapContentSchema,
	footerContent: tiptapContentSchema,
	showMeeting: z.boolean(),
	showClasses: z.boolean(),
	showParticipants: z.boolean(),
	showRecords: z.boolean(),
	showGeneralReports: z.boolean(),
	showSignatures: z.boolean(),
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
			footerContent: emptyDoc() as Record<string, unknown>,
			showMeeting: true,
			showClasses: true,
			showParticipants: true,
			showRecords: true,
			showGeneralReports: true,
			showSignatures: true,
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
				<fieldset className="space-y-2">
					<legend className="text-sm font-medium">Blocos da ata</legend>
					{BLOCKS.map((block) => (
						<FormField
							key={block.name}
							control={form.control}
							name={block.name}
							render={({ field }) => (
								<FormItem className="flex flex-row items-center gap-2 space-y-0">
									<FormControl>
										<Checkbox
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
									<FormLabel className="font-normal">{block.label}</FormLabel>
								</FormItem>
							)}
						/>
					))}
				</fieldset>
				{serverError && (
					<p className="text-sm text-destructive">{serverError}</p>
				)}
				<FormSubmit>{submitLabel}</FormSubmit>
			</FormNative>
		</Form>
	);
}
