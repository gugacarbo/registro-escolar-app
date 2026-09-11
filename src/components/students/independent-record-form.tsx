import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Checkbox } from "#/components/ui/checkbox";
import { EntitySelect } from "#/components/ui/entity-select";
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
import { SearchableSelect } from "#/components/ui/searchable-select";
import { Textarea } from "#/components/ui/textarea";
import { fetchClassesPage, fetchComponentsPage } from "#/hooks/entity-fetchers";
import { useAsyncOptions } from "#/hooks/use-async-options";
import { useDebouncedValue } from "#/hooks/use-debounced-value";

const independentRecordFormSchema = z.object({
	texto: z.string().trim().min(1, "Texto é obrigatório"),
	turmaId: z.string(),
	categoriaId: z.string(),
	componenteId: z.string(),
	incluirNaAta: z.boolean(),
});

export type IndependentRecordFormValues = z.infer<
	typeof independentRecordFormSchema
>;

export type IndependentRecordFormSubmitValues = {
	texto: string;
	turmaId: string | null;
	categoriaId: string | null;
	componenteId: string | null;
	incluirNaAta: boolean;
};

export function IndependentRecordForm({
	onSubmit,
	submitLabel,
	defaultValues,
	disabled,
	serverError,
}: {
	onSubmit: (values: IndependentRecordFormSubmitValues) => Promise<void>;
	submitLabel: string;
	defaultValues?: Partial<IndependentRecordFormValues>;
	disabled?: boolean;
	serverError?: string | null;
}) {
	const [classSearch, setClassSearch] = useState("");
	const [componentSearch, setComponentSearch] = useState("");
	const debouncedComponentSearch = useDebouncedValue(componentSearch, 300);
	const { data: classesResult, isLoading: isLoadingClasses } = useAsyncOptions({
		queryKey: ["record-form", "classes"],
		search: classSearch,
		fetchPage: fetchClassesPage,
		select: (turma) => ({ id: turma.id, name: turma.name }),
	});
	const { data: componentsResult, isLoading: isLoadingComponents } =
		useAsyncOptions({
			queryKey: ["record-form", "components"],
			search: debouncedComponentSearch,
			fetchPage: fetchComponentsPage,
			select: (component) => ({ id: component.id, name: component.name }),
		});
	const componentsHint =
		componentsResult && !componentsResult.loadedAll
			? `Mostrando ${componentsResult.options.length} de ${componentsResult.total}. Refine a busca para ver mais.`
			: undefined;

	const form = useForm<IndependentRecordFormValues>({
		resolver: zodResolver(independentRecordFormSchema),
		mode: "onTouched",
		defaultValues: {
			texto: "",
			turmaId: "",
			categoriaId: "",
			componenteId: "",
			incluirNaAta: true,
			...defaultValues,
		},
	});

	async function handleValidSubmit(values: IndependentRecordFormValues) {
		const ok = await onSubmit({
			texto: values.texto,
			turmaId: values.turmaId || null,
			categoriaId: values.categoriaId || null,
			componenteId: values.componenteId || null,
			incluirNaAta: values.incluirNaAta,
		}).then(
			() => true,
			() => false,
		);
		if (ok) {
			form.reset();
		}
	}

	return (
		<Form {...form}>
			<FormNative
				onSubmit={() => form.handleSubmit(handleValidSubmit)()}
				className="space-y-3"
			>
				<FormField
					control={form.control}
					name="texto"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Texto *</FormLabel>
							<FormControl>
								<Textarea
									{...field}
									disabled={disabled}
									rows={4}
									placeholder="Descreva o fato observado, sem juízo de valor. Ex.: “Estudante apresentou dificuldade em frações nas últimas 3 aulas”."
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="turmaId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Turma (opcional)</FormLabel>
							<FormControl>
								<EntitySelect
									label="Turma"
									placeholder="Selecione a turma"
									value={field.value}
									onChange={field.onChange}
									options={classesResult?.options ?? []}
									isLoading={isLoadingClasses}
									total={classesResult?.total ?? 0}
									loadedAll={classesResult?.loadedAll ?? true}
									search={classSearch}
									onSearchChange={setClassSearch}
									disabled={disabled}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="grid gap-3 sm:grid-cols-2">
					<FormField
						control={form.control}
						name="categoriaId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Categoria (opcional)</FormLabel>
								<FormControl>
									<Input
										{...field}
										disabled={disabled}
										placeholder="Ex.: Comportamento, Aprendizagem"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="componenteId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Componente curricular (opcional)</FormLabel>
								<FormControl>
									<SearchableSelect
										label="Componente curricular"
										placeholder="Selecione o componente"
										value={field.value}
										onChange={field.onChange}
										options={componentsResult?.options ?? []}
										isLoading={isLoadingComponents}
										hint={componentsHint}
										search={componentSearch}
										onSearchChange={setComponentSearch}
										disabled={disabled}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name="incluirNaAta"
					render={({ field }) => (
						<FormItem className="flex items-center gap-2 space-y-0">
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={(checked) => field.onChange(!!checked)}
									disabled={disabled}
									aria-describedby="incluir-ata-hint-independent"
								/>
							</FormControl>
							<div>
								<FormLabel>Incluir na ata</FormLabel>
								<p
									id="incluir-ata-hint-independent"
									className="text-xs text-muted-foreground"
								>
									Marcado: aparece na ata oficial. Desmarcado: só registro
									interno.
								</p>
							</div>
						</FormItem>
					)}
				/>
				{serverError && (
					<p className="text-sm text-destructive">{serverError}</p>
				)}
				<div className="flex items-center gap-2">
					<FormSubmit disabled={disabled}>{submitLabel}</FormSubmit>
				</div>
			</FormNative>
		</Form>
	);
}
