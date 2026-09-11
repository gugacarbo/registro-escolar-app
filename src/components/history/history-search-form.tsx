import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { useState } from "react";
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
	FormReset,
	FormSubmit,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { SearchableSelect } from "#/components/ui/searchable-select";
import { fetchClassesPage, fetchComponentsPage } from "#/hooks/entity-fetchers";
import { useAsyncOptions } from "#/hooks/use-async-options";

const historySearchSchema = z.object({
	q: z.string(),
	turmaId: z.string(),
	componenteId: z.string(),
	periodo: z.string(),
});

export type HistorySearchValues = z.infer<typeof historySearchSchema>;

export function HistorySearchForm({
	defaultValues,
	onSubmit,
	onReset,
	hideStudentFilters = false,
	className,
}: {
	defaultValues?: Partial<HistorySearchValues>;
	onSubmit: (values: HistorySearchValues) => void;
	/** Chamado ao clicar em "Limpar", após resetar os campos. */
	onReset?: () => void;
	hideStudentFilters?: boolean;
	/** Classes extras da grade do formulário (ex.: mais colunas). */
	className?: string;
}) {
	const [turmaSearch, setTurmaSearch] = useState("");
	const [componenteSearch, setComponenteSearch] = useState("");
	const { data: classesResult, isLoading: isLoadingClasses } = useAsyncOptions({
		queryKey: ["history-search-form", "classes"],
		search: turmaSearch,
		fetchPage: fetchClassesPage,
		select: (class_) => ({ id: class_.id, name: class_.name }),
	});
	const classes = classesResult?.options ?? [];
	const classesHint =
		classesResult && !classesResult.loadedAll
			? `Mostrando ${classes.length} de ${classesResult.total}. Refine a busca para ver mais.`
			: undefined;
	const { data: componentsResult, isLoading: isLoadingComponents } =
		useAsyncOptions({
			queryKey: ["history-search-form", "components"],
			search: componenteSearch,
			fetchPage: fetchComponentsPage,
			select: (component) => ({ id: component.id, name: component.name }),
		});
	const components = componentsResult?.options ?? [];
	const componentsHint =
		componentsResult && !componentsResult.loadedAll
			? `Mostrando ${components.length} de ${componentsResult.total}. Refine a busca para ver mais.`
			: undefined;

	const form = useForm<HistorySearchValues>({
		resolver: zodResolver(historySearchSchema),
		defaultValues: {
			q: "",
			turmaId: "",
			componenteId: "",
			periodo: "",
			...defaultValues,
		},
	});

	return (
		<Form {...form}>
			<FormNative
				onSubmit={() => form.handleSubmit((values) => onSubmit(values))()}
				className={cn("grid gap-3 md:grid-cols-2", className)}
			>
				<FormField
					control={form.control}
					name="q"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Busca</FormLabel>
							<FormControl>
								<Input {...field} placeholder="Texto, turma ou reunião" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{!hideStudentFilters && (
					<FormField
						control={form.control}
						name="turmaId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Turma</FormLabel>
								<FormControl>
									<SearchableSelect
										label="Turma"
										placeholder="Sem filtro"
										value={field.value}
										onChange={field.onChange}
										options={classes}
										isLoading={isLoadingClasses}
										hint={classesHint}
										search={turmaSearch}
										onSearchChange={setTurmaSearch}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
				<FormField
					control={form.control}
					name="componenteId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Componente</FormLabel>
							<FormControl>
								<SearchableSelect
									label="Componente"
									placeholder="Sem filtro"
									value={field.value}
									onChange={field.onChange}
									options={components}
									isLoading={isLoadingComponents}
									hint={componentsHint}
									search={componenteSearch}
									onSearchChange={setComponenteSearch}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="periodo"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Período</FormLabel>
							<FormControl>
								<Input {...field} placeholder="Ex.: 2026" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex items-center gap-2 md:col-span-2">
					<FormSubmit>Filtrar</FormSubmit>
					{onReset && <FormReset onClick={onReset} />}
				</div>
			</FormNative>
		</Form>
	);
}
