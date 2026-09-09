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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { useClasses } from "#/hooks/classes/use-classes";
import { useComponents } from "#/hooks/components/use-components";
import { useStaff } from "#/hooks/staff/use-staff";

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
	const { data: classesPage } = useClasses({ pageSize: 100 });
	const classes = classesPage?.data ?? [];
	const { data: componentsPage } = useComponents({ pageSize: 100 });
	const components = componentsPage?.data ?? [];
	const { data: staffPage } = useStaff({ pageSize: 100 });
	const staff = staffPage?.data ?? [];

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
							<Select value={field.value} onValueChange={field.onChange}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Selecione a turma" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{classes.map((classRow) => (
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
					name="componenteId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Componente *</FormLabel>
							<Select value={field.value} onValueChange={field.onChange}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Selecione o componente" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{components.map((component) => (
										<SelectItem key={component.id} value={component.id}>
											{component.name}
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
					name="professorIds"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Professores</FormLabel>
							{staff.length === 0 && (
								<p className="text-sm text-muted-foreground">
									Nenhum servidor cadastrado — a oferta pode ficar sem
									professor.
								</p>
							)}
							{staff.map((member) => {
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
