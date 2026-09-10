import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "#/components/ui/button";
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
import { useClasses } from "#/hooks/classes/use-classes";
import { useMinuteTemplates } from "#/hooks/minutes/use-minute-templates";
import { useRoles } from "#/hooks/roles/use-roles";
import { useStaff } from "#/hooks/staff/use-staff";

const meetingFormSchema = z.object({
	nome: z.string().trim().min(1, "Nome é obrigatório"),
	data: z.string().optional(),
	turmaIds: z.array(z.string()).min(1, "Selecione ao menos uma turma"),
	participantes: z.array(
		z.object({
			servidorId: z.string(),
			papelId: z.string(),
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
}: {
	onSubmit: (values: MeetingFormValues) => void | Promise<void>;
	submitLabel?: string;
	defaultValues?: Partial<MeetingFormValues>;
	serverError?: string | null;
}) {
	const { data: classesPage } = useClasses({ pageSize: 500 });
	const classes = classesPage?.data ?? [];
	const { data: staffPage } = useStaff({ pageSize: 500 });
	const staff = staffPage?.data ?? [];
	const { data: rolesPage } = useRoles({ pageSize: 500 });
	const roles = rolesPage?.data ?? [];
	const { data: templates = [] } = useMinuteTemplates();

	const form = useForm<MeetingFormValues>({
		resolver: zodResolver(meetingFormSchema),
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
				<FormField
					control={form.control}
					name="turmaIds"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Turmas *</FormLabel>
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
										{classRow.name} — {classRow.academicPeriod}
									</label>
								))}
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="grid gap-2">
					<Label htmlFor={undefined}>Participantes</Label>
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
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger aria-label="Servidor">
												<SelectValue placeholder="Servidor" />
											</SelectTrigger>
											<SelectContent>
												{staff.map((member) => (
													<SelectItem key={member.id} value={member.id}>
														{member.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
								<FormField
									control={form.control}
									name={`participantes.${index}.papelId`}
									render={({ field }) => (
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger aria-label="Papel">
												<SelectValue placeholder="Papel" />
											</SelectTrigger>
											<SelectContent>
												{roles.map((role) => (
													<SelectItem key={role.id} value={role.id}>
														{role.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
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
							onClick={() => append({ servidorId: "", papelId: "" })}
						>
							Adicionar participante
						</Button>
					</div>
				</div>
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
