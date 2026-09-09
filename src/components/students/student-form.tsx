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

const studentFormSchema = z.object({
	name: z.string().trim().min(1, "Nome é obrigatório"),
	document: z.string().optional(),
	registrationNumber: z.string().optional(),
	email: z
		.string()
		.optional()
		.refine((value) => !value || /.+@.+\..+/.test(value), {
			message: "Email inválido",
		}),
	phone: z.string().optional(),
	birthDate: z.string().optional(),
	notes: z.string().optional(),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

export function StudentForm({
	onSubmit,
	submitLabel = "Salvar",
	defaultValues,
	serverError,
}: {
	onSubmit: (values: StudentFormValues) => void | Promise<void>;
	submitLabel?: string;
	defaultValues?: Partial<StudentFormValues>;
	serverError?: string | null;
}) {
	const form = useForm<StudentFormValues>({
		resolver: zodResolver(studentFormSchema),
		defaultValues: {
			name: "",
			document: "",
			registrationNumber: "",
			email: "",
			phone: "",
			birthDate: "",
			notes: "",
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
					name="name"
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
					name="document"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Documento</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input {...field} type="email" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="phone"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Telefone</FormLabel>
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
