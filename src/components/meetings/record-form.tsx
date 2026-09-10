import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useParticipantName } from "#/components/meetings/participant-name";
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
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { useComponents } from "#/hooks/components/use-components";
import { useParticipants } from "#/hooks/meetings/use-participants";

const recordFormSchema = z.object({
	texto: z.string().trim().min(1, "Texto é obrigatório"),
	categoriaId: z.string(),
	componenteId: z.string(),
	origemId: z.string(),
	incluirNaAta: z.boolean(),
});

export type RecordFormValues = z.infer<typeof recordFormSchema>;

export type RecordFormSubmitValues = {
	texto: string;
	categoriaId: string | null;
	componenteId: string | null;
	origemId: string | null;
	incluirNaAta: boolean;
};

export function RecordForm({
	onSubmit,
	submitLabel,
	defaultValues,
	disabled,
	serverError,
	meetingId,
}: {
	onSubmit: (values: RecordFormSubmitValues) => void | Promise<void>;
	submitLabel: string;
	defaultValues?: Partial<RecordFormValues>;
	disabled?: boolean;
	serverError?: string | null;
	meetingId: string;
}) {
	const { data: componentsPage } = useComponents({ pageSize: 100 });
	const components = componentsPage?.data ?? [];
	const { data: participants = [] } = useParticipants(meetingId);
	const { getParticipantName } = useParticipantName();

	const form = useForm<RecordFormValues>({
		resolver: zodResolver(recordFormSchema),
		defaultValues: {
			texto: "",
			categoriaId: "",
			componenteId: "",
			origemId: "",
			incluirNaAta: true,
			...defaultValues,
		},
	});

	return (
		<Form {...form}>
			<FormNative
				onSubmit={() => form.handleSubmit(onSubmit)()}
				className="space-y-3"
			>
				<FormField
					control={form.control}
					name="texto"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Texto *</FormLabel>
							<FormControl>
								<Textarea {...field} disabled={disabled} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="categoriaId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Categoria</FormLabel>
							<FormControl>
								<Input {...field} disabled={disabled} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="componenteId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Componente curricular</FormLabel>
							<FormControl>
								<Select
									value={field.value}
									onValueChange={field.onChange}
									disabled={disabled}
								>
									<SelectTrigger aria-label="Componente curricular">
										<SelectValue placeholder="Selecione o componente" />
									</SelectTrigger>
									<SelectContent>
										{components.map((component) => (
											<SelectItem key={component.id} value={component.id}>
												{component.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="origemId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Origem</FormLabel>
							<FormControl>
								<Select
									value={field.value}
									onValueChange={field.onChange}
									disabled={disabled}
								>
									<SelectTrigger aria-label="Origem do registro">
										<SelectValue placeholder="Selecione o participante" />
									</SelectTrigger>
									<SelectContent>
										{participants.map((participant) => (
											<SelectItem
												key={participant.id}
												value={getParticipantName(participant.staffId)}
											>
												{getParticipantName(participant.staffId)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="incluirNaAta"
					render={({ field }) => (
						<FormItem className="flex items-center gap-2 space-y-0">
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={(checked) => field.onChange(!!checked)}
									disabled={disabled}
								/>
							</FormControl>
							<FormLabel>Incluir na ata</FormLabel>
						</FormItem>
					)}
				/>
				{serverError && (
					<p className="text-sm text-destructive">{serverError}</p>
				)}
				<div className="flex items-center gap-2">
					<FormSubmit disabled={disabled}>{submitLabel}</FormSubmit>
					<Button type="button" variant="outline" onClick={() => form.reset()}>
						Limpar
					</Button>
				</div>
			</FormNative>
		</Form>
	);
}
