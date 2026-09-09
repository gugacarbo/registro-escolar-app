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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { useClasses } from "#/hooks/classes/use-classes";
import { useStudents } from "#/hooks/students/use-students";
import { enrollmentStatusValues } from "#/lib/enrollments/schema";

const enrollmentFormSchema = z.object({
	alunoId: z.string().min(1, "Aluno é obrigatório"),
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
	const { data: studentsPage } = useStudents({ pageSize: 100 });
	const students = studentsPage?.data ?? [];
	const { data: classes } = useClasses();

	const form = useForm<EnrollmentFormValues>({
		resolver: zodResolver(enrollmentFormSchema),
		defaultValues: {
			alunoId: "",
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
					name="alunoId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Aluno *</FormLabel>
							<Select value={field.value} onValueChange={field.onChange}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Selecione o aluno" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{(students ?? []).map((student) => (
										<SelectItem key={student.id} value={student.id}>
											{student.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
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
							<Select value={field.value} onValueChange={field.onChange}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Selecione a turma" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{(classes ?? []).map((classRow) => (
										<SelectItem key={classRow.id} value={classRow.id}>
											{classRow.name} — {classRow.academicPeriod}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
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
