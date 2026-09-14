import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { useCreateEnrollment } from "#/hooks/enrollments/use-create-enrollment";
import { fetchClassesPage, fetchStudentsPage } from "#/hooks/entity-fetchers";
import { useAsyncOptions } from "#/hooks/use-async-options";
import { useInfiniteAsyncOptions } from "#/hooks/use-infinite-async-options";
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

	const {
		options: rawStudentOptions,
		total: totalStudents,
		isLoading: isLoadingStudents,
		isFetchingNextPage: isFetchingMoreStudents,
		hasNextPage: hasMoreStudents,
		fetchNextPage: fetchMoreStudents,
	} = useInfiniteAsyncOptions({
		queryKey: ["enrollment-dialog", "students"],
		search: studentSearch,
		pageSize: 20,
		fetchPage: fetchStudentsPage,
		select: (student) => ({
			id: student.id,
			name: student.name,
			reference: student.reference,
		}),
		enabled: open && !fixedStudent,
	});
	const studentOptions = rawStudentOptions.filter((option) => {
		if (excludedStudentIds.includes(option.id)) return false;
		if (!studentSearch.trim()) return true;
		const term = studentSearch.trim().toLowerCase();
		return (
			option.name.toLowerCase().includes(term) ||
			Boolean(option.reference?.toLowerCase().includes(term))
		);
	});

	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const handleTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
		if (scrollHeight - scrollTop - clientHeight < 60) {
			if (hasMoreStudents && !isFetchingMoreStudents) {
				void fetchMoreStudents();
			}
		}
	};

	useEffect(() => {
		const sentinel = sentinelRef.current;
		const container = scrollContainerRef.current;
		if (!sentinel || !container || !hasMoreStudents || isFetchingMoreStudents) {
			return;
		}
		if (typeof IntersectionObserver === "undefined") {
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					void fetchMoreStudents();
				}
			},
			{
				root: container,
				rootMargin: "60px",
			},
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasMoreStudents, isFetchingMoreStudents, fetchMoreStudents]);
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
			setStudentSearch("");
			setClassSearch("");
			form.reset();
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				{trigger ?? <Button>Matricular estudante</Button>}
			</DialogTrigger>
			<DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
											<div className="rounded-md border">
												<div className="p-3 border-b">
													<Input
														value={studentSearch}
														onChange={(event) =>
															setStudentSearch(event.target.value)
														}
														placeholder="Buscar por nome ou referência..."
														aria-label="Buscar estudante"
													/>
												</div>
												<div
													ref={scrollContainerRef}
													onScroll={handleTableScroll}
													className="relative max-h-72 overflow-y-auto"
												>
													<Table>
														<TableHeader className="sticky top-0 z-10 bg-background shadow-xs">
															<TableRow>
																<TableHead className="w-12 text-center">
																	<Checkbox
																		checked={
																			studentOptions.length > 0 &&
																			studentOptions.every((opt) =>
																				field.value.includes(opt.id),
																			)
																				? true
																				: studentOptions.some((opt) =>
																							field.value.includes(opt.id),
																						)
																					? "indeterminate"
																					: false
																		}
																		onCheckedChange={(checked) => {
																			if (checked === true) {
																				const newIds = new Set([
																					...field.value,
																					...studentOptions.map(
																						(opt) => opt.id,
																					),
																				]);
																				field.onChange(Array.from(newIds));
																			} else {
																				const removeIds = new Set(
																					studentOptions.map((opt) => opt.id),
																				);
																				field.onChange(
																					field.value.filter(
																						(id) => !removeIds.has(id),
																					),
																				);
																			}
																		}}
																		aria-label="Selecionar todos os estudantes"
																	/>
																</TableHead>
																<TableHead>Estudante</TableHead>
																<TableHead className="w-44">
																	Referência
																</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{studentOptions.map((option) => {
																const isSelected = field.value.includes(
																	option.id,
																);
																return (
																	<TableRow
																		key={option.id}
																		data-state={
																			isSelected ? "selected" : undefined
																		}
																		className="cursor-pointer"
																		onClick={() => {
																			field.onChange(
																				isSelected
																					? field.value.filter(
																							(id) => id !== option.id,
																						)
																					: [...field.value, option.id],
																			);
																		}}
																	>
																		<TableCell
																			className="w-12 text-center"
																			onClick={(e) => e.stopPropagation()}
																		>
																			<Checkbox
																				checked={isSelected}
																				aria-label={option.name}
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
																		</TableCell>
																		<TableCell className="font-medium">
																			{option.name}
																		</TableCell>
																		<TableCell className="text-muted-foreground">
																			{option.reference || "—"}
																		</TableCell>
																	</TableRow>
																);
															})}
															{isLoadingStudents && (
																<TableRow>
																	<TableCell
																		colSpan={3}
																		className="h-24 text-center text-muted-foreground"
																	>
																		<div role="status">
																			Carregando estudantes...
																		</div>
																	</TableCell>
																</TableRow>
															)}
															{!isLoadingStudents &&
																studentOptions.length === 0 && (
																	<TableRow>
																		<TableCell
																			colSpan={3}
																			className="h-24 text-center text-muted-foreground"
																		>
																			{studentSearch.trim()
																				? "Nenhum estudante encontrado para a busca."
																				: "Nenhum estudante disponível."}
																		</TableCell>
																	</TableRow>
																)}
															{isFetchingMoreStudents && (
																<TableRow>
																	<TableCell
																		colSpan={3}
																		className="py-3 text-center text-xs text-muted-foreground"
																	>
																		<div role="status">
																			Carregando mais estudantes...
																		</div>
																	</TableCell>
																</TableRow>
															)}
														</TableBody>
													</Table>
													<div
														ref={sentinelRef}
														className="h-1 w-full"
														aria-hidden="true"
													/>
												</div>
												<div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
													<span>
														{totalStudents > 0
															? `Exibindo ${studentOptions.length} de ${totalStudents} estudante${totalStudents === 1 ? "" : "s"}`
															: `${studentOptions.length} estudante${studentOptions.length === 1 ? "" : "s"}`}
													</span>
													{hasMoreStudents && !isFetchingMoreStudents && (
														<button
															type="button"
															onClick={() => void fetchMoreStudents()}
															className="text-primary hover:underline"
														>
															Carregar mais
														</button>
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

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
						</div>

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
