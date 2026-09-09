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

const componentFormSchema = z.object({
	nome: z.string().trim().min(1, "Nome é obrigatório"),
});

export type ComponentFormValues = z.infer<typeof componentFormSchema>;

export function ComponentForm({
	onSubmit,
	submitLabel = "Salvar",
	defaultValues,
	serverError,
}: {
	onSubmit: (values: ComponentFormValues) => void | Promise<void>;
	submitLabel?: string;
	defaultValues?: Partial<ComponentFormValues>;
	serverError?: string | null;
}) {
	const form = useForm<ComponentFormValues>({
		resolver: zodResolver(componentFormSchema),
		defaultValues: {
			nome: "",
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
								<Input {...field} placeholder="Ex.: Matemática" />
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
