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

const classFormSchema = z.object({
	nome: z.string().trim().min(1, "Nome é obrigatório"),
	periodoLetivo: z.string().trim().min(1, "Período letivo é obrigatório"),
	curso: z.string().optional(),
	serie: z.string().optional(),
	turno: z.string().optional(),
});

export type ClassFormValues = z.infer<typeof classFormSchema>;

export function ClassForm({
	onSubmit,
	submitLabel = "Salvar",
	defaultValues,
	serverError,
}: {
	onSubmit: (values: ClassFormValues) => void | Promise<void>;
	submitLabel?: string;
	defaultValues?: Partial<ClassFormValues>;
	serverError?: string | null;
}) {
	const form = useForm<ClassFormValues>({
		resolver: zodResolver(classFormSchema),
		defaultValues: {
			nome: "",
			periodoLetivo: "",
			curso: "",
			serie: "",
			turno: "",
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
					name="periodoLetivo"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Período letivo *</FormLabel>
							<FormControl>
								<Input {...field} placeholder="2026" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="curso"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Curso</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="serie"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Série</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="turno"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Turno</FormLabel>
							<FormControl>
								<Input {...field} />
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
