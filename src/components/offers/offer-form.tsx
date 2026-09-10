import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import {
	fetchClassesPage,
	fetchComponentsPage,
	fetchStaffPage,
} from "#/hooks/entity-fetchers";
import { useAsyncOptions } from "#/hooks/use-async-options";

const offerFormSchema = z.object({
	turmaId: z.string().min(1, "Turma é obrigatória"),
	componenteId: z.string().min(1, "Componente é obrigatório"),
	professorIds: z.array(z.string()),
});

export type OfferFormValues = z.infer<typeof offerFormSchema>;

export function OfferForm({
	onSubmit,
	submitLabel = "Ofertar componente",
	defaultValues,
	serverError,
}: {
	onSubmit: (values: OfferFormValues) => void | Promise<void>;
	submitLabel?: string;
	defaultValues?: Partial<OfferFormValues>;
	serverError?: string | null;
}) {
	const [classSearch, setClassSearch] = useState("");
	const [componentSearch, setComponentSearch] = useState("");
	const [staffSearch, setStaffSearch] = useState("");
	const { data: classesResult, isLoading: isLoadingClasses } = useAsyncOptions({
		queryKey: ["offer-form", "classes"],
		search: classSearch,
		fetchPage: fetchClassesPage,
		select: (classRow) => ({
			id: classRow.id,
			name: `${classRow.name} — ${classRow.academicPeriod}`,
		}),
	});
	const classes = classesResult?.options ?? [];
	const { data: componentsResult, isLoading: isLoadingComponents } =
		useAsyncOptions({
			queryKey: ["offer-form", "components"],
			search: componentSearch,
			fetchPage: fetchComponentsPage,
			select: (component) => ({ id: component.id, name: component.name }),
		});
	const components = componentsResult?.options ?? [];
	const { data: staffResult, isLoading: isLoadingStaff } = useAsyncOptions({
		queryKey: ["offer-form", "staff"],
		search: staffSearch,
		fetchPage: fetchStaffPage,
		select: (member) => ({ id: member.id, name: member.name }),
	});
	const staffOptions = staffResult?.options ?? [];
	const staffById = new Map(
		staffOptions.map((member) => [member.id, member.name]),
	);

	const form = useForm<OfferFormValues>({
		resolver: zodResolver(offerFormSchema),
		defaultValues: {
			turmaId: "",
			componenteId: "",
			professorIds: [],
			...defaultValues,
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
					name="turmaId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Turma *</FormLabel>
							<FormControl>
								<EntitySelect
									label="Turma"
									placeholder="Selecione a turma"
									value={field.value}
									onChange={field.onChange}
									options={classes}
									isLoading={isLoadingClasses}
									total={classesResult?.total ?? 0}
									loadedAll={classesResult?.loadedAll ?? true}
									search={classSearch}
									onSearchChange={setClassSearch}
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
							<FormLabel>Componente *</FormLabel>
							<FormControl>
								<EntitySelect
									label="Componente"
									placeholder="Selecione o componente"
									value={field.value}
									onChange={field.onChange}
									options={components}
									isLoading={isLoadingComponents}
									total={componentsResult?.total ?? 0}
									loadedAll={componentsResult?.loadedAll ?? true}
									search={componentSearch}
									onSearchChange={setComponentSearch}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="professorIds"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Professores</FormLabel>
							<Input
								value={staffSearch}
								onChange={(event) => setStaffSearch(event.target.value)}
								placeholder="Buscar servidor"
								aria-label="Buscar servidor"
							/>
							{staffOptions.length === 0 && !isLoadingStaff && (
								<p className="text-sm text-muted-foreground">
									Nenhum servidor encontrado para a busca — a oferta pode ficar
									sem professor.
								</p>
							)}
							{staffOptions.map((member) => {
								const checked = field.value.includes(member.id);
								return (
									<label
										key={member.id}
										className="flex items-center gap-2 text-sm"
									>
										<input
											type="checkbox"
											value={member.id}
											checked={checked}
											onChange={(event) => {
												const next = event.target.checked
													? [...field.value, member.id]
													: field.value.filter((id) => id !== member.id);
												field.onChange(next);
											}}
										/>
										{member.name}
									</label>
								);
							})}
							{!isLoadingStaff && staffResult && !staffResult.loadedAll && (
								<p className="text-xs text-muted-foreground">
									Mostrando {staffOptions.length} de {staffResult.total}. Refine
									a busca para ver mais.
								</p>
							)}
							{field.value.map((id) => {
								if (staffById.has(id)) return null;
								return (
									<label key={id} className="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											value={id}
											checked
											onChange={(event) => {
												if (!event.target.checked) {
													field.onChange(
														field.value.filter((current) => current !== id),
													);
												}
											}}
										/>
										{id}
									</label>
								);
							})}
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
