import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "#/components/ui/button";
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
	useFieldArray,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	fetchClassesPage,
	fetchRolesPage,
	fetchStaffPage,
} from "#/hooks/entity-fetchers";
import { useMinuteTemplates } from "#/hooks/minutes/use-minute-templates";
import { useAsyncOptions } from "#/hooks/use-async-options";

const meetingFormSchema = z.object({
	nome: z.string().trim().min(1, "Nome é obrigatório"),
	data: z.string().optional(),
	turmaIds: z.array(z.string()).min(1, "Selecione ao menos uma turma"),
	participantes: z.array(
		z.object({
			servidorId: z.string(),
			papelIds: z.array(z.string()),
		}),
	),
	templateId: z.string().optional(),
});

export type MeetingFormValues = z.infer<typeof meetingFormSchema>;

export function MeetingForm({
	onSubmit,
	submitLabel = "Salvar",
	defaultValues,
	serverError,
	mode = "create",
}: {
	onSubmit: (values: MeetingFormValues) => void | Promise<void>;
	submitLabel?: string;
	defaultValues?: Partial<MeetingFormValues>;
	serverError?: string | null;
	mode?: "create" | "edit";
}) {
	const [classSearch, setClassSearch] = useState("");
	const [staffSearch, setStaffSearch] = useState("");
	const [roleSearch, setRoleSearch] = useState("");
	const { data: classesResult, isLoading: isLoadingClasses } = useAsyncOptions({
		queryKey: ["meeting-form", "classes"],
		search: classSearch,
		fetchPage: fetchClassesPage,
		select: (classRow) => ({
			id: classRow.id,
			name: `${classRow.name} — ${classRow.academicPeriod}`,
		}),
	});
	const classes = classesResult?.options ?? [];
	const classById = new Map(
		classes.map((classRow) => [classRow.id, classRow.name]),
	);
	const { data: staffResult, isLoading: isLoadingStaff } = useAsyncOptions({
		queryKey: ["meeting-form", "staff"],
		search: staffSearch,
		fetchPage: fetchStaffPage,
		select: (member) => ({
			id: member.id,
			name: member.name,
			defaultRoleId: member.defaultRoleId,
		}),
	});
	const staffOptions = staffResult?.options ?? [];
	const staffById = new Map(
		staffOptions.map((member) => [member.id, member.name]),
	);
	const { data: rolesResult, isLoading: isLoadingRoles } = useAsyncOptions({
		queryKey: ["meeting-form", "roles"],
		search: roleSearch,
		fetchPage: fetchRolesPage,
		select: (role) => ({ id: role.id, name: role.name }),
	});
	const roleOptions = rolesResult?.options ?? [];
	const roleById = new Map(roleOptions.map((role) => [role.id, role.name]));
	const { data: templates = [] } = useMinuteTemplates();

	const form = useForm<MeetingFormValues>({
		resolver: zodResolver(
			mode === "edit"
				? meetingFormSchema.extend({ turmaIds: z.array(z.string()) })
				: meetingFormSchema,
		),
		defaultValues: {
			nome: "",
			data: "",
			turmaIds: [],
			participantes: [],
			templateId: "",
			...defaultValues,
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "participantes",
	});

	return (
		<Form {...form}>
			<FormNative
				onSubmit={() => form.handleSubmit(onSubmit)()}
				className="space-y-4"
			>
				<FormField
					control={form.control}
					name="nome"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Nome *</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="data"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Data</FormLabel>
							<FormControl>
								<Input type="date" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{mode === "create" && (
					<FormField
						control={form.control}
						name="turmaIds"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Turmas *</FormLabel>
								<Input
									value={classSearch}
									onChange={(event) => setClassSearch(event.target.value)}
									placeholder="Buscar turma"
									aria-label="Buscar turma"
								/>
								<div className="grid gap-2">
									{classes.map((classRow) => (
										<label
											key={classRow.id}
											className="flex items-center gap-2 text-sm"
										>
											<Checkbox
												checked={field.value.includes(classRow.id)}
												onCheckedChange={(checked) =>
													field.onChange(
														checked
															? [...field.value, classRow.id]
															: field.value.filter((id) => id !== classRow.id),
													)
												}
											/>
											{classRow.name}
										</label>
									))}
								</div>
								{isLoadingClasses && (
									<p className="text-xs text-muted-foreground">
										Carregando turmas...
									</p>
								)}
								{!isLoadingClasses && classes.length === 0 && (
									<p className="text-xs text-muted-foreground">
										Nenhuma turma encontrada para a busca.
									</p>
								)}
								{!isLoadingClasses &&
									classesResult &&
									!classesResult.loadedAll && (
										<p className="text-xs text-muted-foreground">
											Mostrando {classes.length} de {classesResult.total}.
											Refine a busca para ver mais.
										</p>
									)}
								{field.value.map((id) => {
									if (classById.has(id)) return null;
									return (
										<label key={id} className="flex items-center gap-2 text-sm">
											<Checkbox
												checked
												onCheckedChange={(checked) => {
													if (!checked) {
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
				)}

				{mode === "create" && (
					<div className="grid gap-2">
						<Label htmlFor={undefined}>Participantes</Label>
						<div className="grid gap-2">
							<Input
								value={staffSearch}
								onChange={(event) => setStaffSearch(event.target.value)}
								placeholder="Buscar servidor"
								aria-label="Buscar servidor"
							/>
							<Input
								value={roleSearch}
								onChange={(event) => setRoleSearch(event.target.value)}
								placeholder="Buscar cargo"
								aria-label="Buscar cargo"
							/>
							{!isLoadingStaff && staffResult && !staffResult.loadedAll && (
								<p className="text-xs text-muted-foreground">
									Mostrando {staffOptions.length} de {staffResult.total}{" "}
									servidores. Refine a busca para ver mais.
								</p>
							)}
							{!isLoadingRoles && rolesResult && !rolesResult.loadedAll && (
								<p className="text-xs text-muted-foreground">
									Mostrando {roleOptions.length} de {rolesResult.total} cargos.
									Refine a busca para ver mais.
								</p>
							)}
						</div>
						<div className="space-y-2">
							{fields.map((participantField, index) => (
								<div
									key={participantField.id}
									className="flex flex-wrap items-center gap-2"
								>
									<FormField
										control={form.control}
										name={`participantes.${index}.servidorId`}
										render={({ field }) => (
											<EntitySelect
												label="Servidor"
												placeholder="Servidor"
												value={field.value}
												onChange={(value) => {
													field.onChange(value);
													const selectedStaff = staffOptions.find(
														(member) => member.id === value,
													);
													form.setValue(
														`participantes.${index}.papelIds`,
														selectedStaff?.defaultRoleId
															? [selectedStaff.defaultRoleId]
															: [],
														{ shouldDirty: true },
													);
												}}
												options={[
													...staffOptions,
													...(field.value && !staffById.has(field.value)
														? [{ id: field.value, name: field.value }]
														: []),
												]}
												isLoading={isLoadingStaff}
												total={staffResult?.total ?? 0}
												loadedAll={staffResult?.loadedAll ?? true}
												search={staffSearch}
												onSearchChange={setStaffSearch}
											/>
										)}
									/>
									<FormField
										control={form.control}
										name={`participantes.${index}.papelIds`}
										render={({ field }) => (
											<div className="grid min-w-48 gap-2">
												<Label>Cargos</Label>
												<div className="grid gap-2 rounded-md border p-2">
													{roleOptions.map((role) => (
														<label
															key={role.id}
															className="flex items-center gap-2 text-sm"
														>
															<Checkbox
																checked={field.value.includes(role.id)}
																onCheckedChange={(checked) =>
																	field.onChange(
																		checked
																			? [...field.value, role.id]
																			: field.value.filter(
																					(id) => id !== role.id,
																				),
																	)
																}
															/>
															{role.name}
														</label>
													))}
													{isLoadingRoles && (
														<p className="text-xs text-muted-foreground">
															Carregando cargos...
														</p>
													)}
													{field.value.map((id) => {
														if (roleById.has(id)) return null;
														return (
															<label
																key={id}
																className="flex items-center gap-2 text-sm"
															>
																<Checkbox checked disabled />
																{id}
															</label>
														);
													})}
												</div>
												<p className="text-xs text-muted-foreground">
													{field.value.length === 0
														? "Selecione um ou mais cargos."
														: `${field.value.length} cargo(s) selecionado(s)`}
												</p>
												<FormMessage />
											</div>
										)}
									/>
									<Button
										type="button"
										variant="outline"
										onClick={() => remove(index)}
									>
										Remover
									</Button>
								</div>
							))}
							<Button
								type="button"
								variant="secondary"
								onClick={() => append({ servidorId: "", papelIds: [] })}
							>
								Adicionar participante
							</Button>
						</div>
					</div>
				)}

				<FormField
					control={form.control}
					name="templateId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Modelo de ata</FormLabel>
							<FormControl>
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger aria-label="Modelo de ata">
										<SelectValue placeholder="Selecione o modelo" />
									</SelectTrigger>
									<SelectContent>
										{templates.map((template) => (
											<SelectItem key={template.id} value={template.id}>
												{template.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
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
