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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { fetchClassesPage, fetchStudentsPage } from "#/hooks/entity-fetchers";
import { useAsyncOptions } from "#/hooks/use-async-options";
import { enrollmentStatusValues } from "#/lib/enrollments/schema";

const enrollmentFormSchema = z.object({
	estudanteId: z.string().min(1, "Estudante é obrigatório"),
	turmaId: z.string().min(1, "Turma é obrigatória"),
	dataInicio: z.string().min(1, "Data de início é obrigatória"),
	dataTermino: z.string().optional(),
	status: z.enum(enrollmentStatusValues),
});

export type EnrollmentFormValues = z.infer<typeof enrollmentFormSchema>;

export function EnrollmentForm({
	onSubmit,
	submitLabel = "Matricular",
	serverError,
	defaultTurmaId,
}: {
	onSubmit: (values: EnrollmentFormValues) => void | Promise<void>;
	submitLabel?: string;
	serverError?: string | null;
	defaultTurmaId?: string;
}) {
	const [studentSearch, setStudentSearch] = useState("");
	const [classSearch, setClassSearch] = useState("");
	const { data: studentsResult, isLoading: isLoadingStudents } =
		useAsyncOptions({
			queryKey: ["enrollment-form", "students"],
			search: studentSearch,
			fetchPage: fetchStudentsPage,
			select: (student) => ({ id: student.id, name: student.name }),
		});
	const students = studentsResult?.options ?? [];
	const { data: classesResult, isLoading: isLoadingClasses } = useAsyncOptions({
		queryKey: ["enrollment-form", "classes"],
		search: classSearch,
		fetchPage: fetchClassesPage,
		select: (classRow) => ({
			id: classRow.id,
			name: `${classRow.name} — ${classRow.academicPeriod}`,
		}),
	});
	const classes = classesResult?.options ?? [];

	const form = useForm<EnrollmentFormValues>({
		resolver: zodResolver(enrollmentFormSchema),
		defaultValues: {
			estudanteId: "",
			turmaId: defaultTurmaId ?? "",
			dataInicio: "",
			dataTermino: "",
			status: "ativa",
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
					name="estudanteId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Estudante *</FormLabel>
							<FormControl>
								<EntitySelect
									label="Estudante"
									placeholder="Selecione o estudante"
									value={field.value}
									onChange={field.onChange}
									options={students}
									isLoading={isLoadingStudents}
									total={studentsResult?.total ?? 0}
									loadedAll={studentsResult?.loadedAll ?? true}
									search={studentSearch}
									onSearchChange={setStudentSearch}
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
				<FormField
					control={form.control}
					name="status"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Status</FormLabel>
							<Select value={field.value} onValueChange={field.onChange}>
								<FormControl>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{enrollmentStatusValues.map((status) => (
										<SelectItem key={status} value={status}>
											{status}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
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
