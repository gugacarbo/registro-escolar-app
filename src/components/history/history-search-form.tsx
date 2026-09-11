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
	FormReset,
	FormSubmit,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { cn } from "cn";

const historySearchSchema = z.object({
	q: z.string(),
	turmaId: z.string(),
	componenteId: z.string(),
	periodo: z.string(),
});

export type HistorySearchValues = z.infer<typeof historySearchSchema>;

export function HistorySearchForm({
	defaultValues,
	onSubmit,
	onReset,
	hideStudentFilters = false,
	className,
}: {
	defaultValues?: Partial<HistorySearchValues>;
	onSubmit: (values: HistorySearchValues) => void;
	/** Chamado ao clicar em "Limpar", após resetar os campos. */
	onReset?: () => void;
	hideStudentFilters?: boolean;
	/** Classes extras da grade do formulário (ex.: mais colunas). */
	className?: string;
}) {
	const form = useForm<HistorySearchValues>({
		resolver: zodResolver(historySearchSchema),
		defaultValues: {
			q: "",
			turmaId: "",
			componenteId: "",
			periodo: "",
			...defaultValues,
		},
	});

	return (
		<Form {...form}>
			<FormNative
				onSubmit={() => form.handleSubmit(onSubmit)()}
				className={cn("grid gap-3 md:grid-cols-2", className)}
			>
				<FormField
					control={form.control}
					name="q"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Busca</FormLabel>
							<FormControl>
								<Input {...field} placeholder="Texto, turma ou reunião" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{!hideStudentFilters && (
					<FormField
						control={form.control}
						name="turmaId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Turma</FormLabel>
								<FormControl>
									<Input {...field} placeholder="ID da turma" />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
				<FormField
					control={form.control}
					name="componenteId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Componente</FormLabel>
							<FormControl>
								<Input {...field} placeholder="ID do componente" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="periodo"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Período</FormLabel>
							<FormControl>
								<Input {...field} placeholder="Ex.: 2026" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex items-center gap-2 md:col-span-2">
					<FormSubmit>Filtrar</FormSubmit>
					{onReset && <FormReset onClick={onReset} />}
				</div>
			</FormNative>
		</Form>
	);
}
