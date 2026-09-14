import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
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
import { useCreateEnrollment } from "#/hooks/enrollments/use-create-enrollment";
import { fetchClassesPage, fetchStudentsPage } from "#/hooks/entity-fetchers";
import { useAsyncOptions } from "#/hooks/use-async-options";
import { enrollmentStatusValues } from "#/lib/enrollments/schema";

const enrollmentDialogSchema = z.object({
	estudanteIds: z.array(z.string()).min(1, "Selecione pelo menos um estudante"),
	turmaId: z.string().min(1, "Turma é obrigatória"),
	dataInicio: z.string().min(1, "Data de início é obrigatória"),
	dataTermino: z.string().optional(),
	status: z.enum(enrollmentStatusValues),
});

type EnrollmentDialogValues = z.infer<typeof enrollmentDialogSchema>;

export function EnrollmentDialog({
	trigger,
	defaultTurmaId,
	turmaName,
	defaultEstudanteId,
	estudanteName,
	excludedStudentIds = [],
	excludedTurmaIds = [],
}: {
	trigger?: React.ReactNode;
	defaultTurmaId?: string;
	turmaName?: string;
	defaultEstudanteId?: string;
	estudanteName?: string;
	excludedStudentIds?: string[];
	excludedTurmaIds?: string[];
}) {
	const [open, setOpen] = useState(false);
	const [studentSearch, setStudentSearch] = useState("");
	const [classSearch, setClassSearch] = useState("");
	const [serverError, setServerError] = useState<string | null>(null);
	const createEnrollment = useCreateEnrollment();
	const fixedStudent = Boolean(defaultEstudanteId);
	const fixedClass = Boolean(defaultTurmaId);
	const form = useForm<EnrollmentDialogValues>({
		resolver: zodResolver(enrollmentDialogSchema),
		defaultValues: {
			estudanteIds: defaultEstudanteId ? [defaultEstudanteId] : [],
			turmaId: defaultTurmaId ?? "",
			dataInicio: "",
			dataTermino: "",
			status: "ativa",
		},
	});

	const { data: studentsResult, isLoading: isLoadingStudents } =
		useAsyncOptions({
			queryKey: ["enrollment-dialog", "students"],
			search: studentSearch,
			fetchPage: fetchStudentsPage,
			select: (student) => ({ id: student.id, name: student.name }),
			enabled: open && !fixedStudent,
		});
	const studentOptions = (studentsResult?.options ?? []).filter(
		(option) => !excludedStudentIds.includes(option.id),
	);
	const { data: classesResult, isLoading: isLoadingClasses } = useAsyncOptions({
		queryKey: ["enrollment-dialog", "classes"],
		search: classSearch,
		fetchPage: fetchClassesPage,
		select: (classRow) => ({
			id: classRow.id,
			name: `${classRow.name} — ${classRow.academicPeriod}`,
		}),
		enabled: open && !fixedClass,
	});
	const classOptions = (classesResult?.options ?? []).filter(
		(option) => !excludedTurmaIds.includes(option.id),
	);

	const selectedCount = form.watch("estudanteIds").length;
	const submitLabel = fixedStudent
		? "Matricular estudante"
		: `Matricular ${selectedCount || ""} estudante${selectedCount === 1 ? "" : "s"}`;

	async function handleSubmit(values: EnrollmentDialogValues) {
		setServerError(null);
		try {
			for (const estudanteId of values.estudanteIds) {
				await createEnrollment.mutateAsync({
					estudanteId,
					turmaId: values.turmaId,
					dataInicio: values.dataInicio,
					...(values.dataTermino ? { dataTermino: values.dataTermino } : {}),
					status: values.status,
				});
			}
			toast.success(
				values.estudanteIds.length === 1
					? "Estudante matriculado"
					: `${values.estudanteIds.length} estudantes matriculados`,
			);
			form.reset();
			setOpen(false);
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (!nextOpen) {
			setServerError(null);
			form.reset();
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				{trigger ?? <Button>Matricular estudante</Button>}
			</DialogTrigger>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>
						{fixedStudent ? "Matricular estudante" : "Matricular estudantes"}
					</DialogTitle>
					<DialogDescription>
						{fixedClass
							? `Selecione os estudantes que entrarão em ${turmaName ?? "esta turma"}.`
							: `Escolha a turma e os dados da matrícula${estudanteName ? ` para ${estudanteName}` : ""}.`}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<FormNative
						onSubmit={() => form.handleSubmit(handleSubmit)()}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="estudanteIds"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Estudantes *</FormLabel>
									{fixedStudent ? (
										<p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
											{estudanteName ?? "Estudante selecionado"}
										</p>
									) : (
										<FormControl>
											<div className="grid gap-2 rounded-md border p-3">
												<Input
													value={studentSearch}
													onChange={(event) =>
														setStudentSearch(event.target.value)
													}
													placeholder="Buscar estudante"
													aria-label="Buscar estudante"
												/>
												<div className="grid max-h-48 gap-1 overflow-y-auto">
													{studentOptions.map((option) => (
														<label
															key={option.id}
															className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
														>
															<Checkbox
																checked={field.value.includes(option.id)}
																onCheckedChange={(checked) => {
																	field.onChange(
																		checked === true
																			? [...field.value, option.id]
																			: field.value.filter(
																					(id) => id !== option.id,
																				),
																	);
																}}
															/>
															<span>{option.name}</span>
														</label>
													))}
													{isLoadingStudents && (
														<p
															role="status"
															className="text-sm text-muted-foreground"
														>
															Carregando estudantes...
														</p>
													)}
													{!isLoadingStudents &&
														studentOptions.length === 0 && (
															<p className="text-sm text-muted-foreground">
																Nenhum estudante disponível.
															</p>
														)}
												</div>
											</div>
										</FormControl>
									)}
									<FormMessage />
								</FormItem>
							)}
						/>

						{fixedClass ? (
							<div className="grid gap-2">
								<p className="text-sm leading-none font-medium">Turma</p>
								<p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
									{turmaName ?? "Turma selecionada"}
								</p>
							</div>
						) : (
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
												options={classOptions}
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
						)}

						<FormField
							control={form.control}
							name="dataInicio"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Data de início *</FormLabel>
									<FormControl>
										<Input {...field} type="date" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="dataTermino"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Data de término</FormLabel>
									<FormControl>
										<Input {...field} type="date" />
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
						<DialogFooter>
							<FormSubmit disabled={selectedCount === 0}>
								{submitLabel}
							</FormSubmit>
						</DialogFooter>
					</FormNative>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
