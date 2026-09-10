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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { useParticipants } from "#/hooks/meetings/use-participants";

const generalReportSchema = z.object({
	texto: z.string().trim().min(1, "Texto é obrigatório"),
	origemId: z.string(),
	incluirNaAta: z.boolean(),
});

export type GeneralReportFormValues = z.infer<typeof generalReportSchema>;

export function GeneralReportForm({
	meetingId,
	onSubmit,
	submitLabel,
	defaultValues,
	disabled,
	serverError,
}: {
	meetingId: string;
	onSubmit: (values: {
		texto: string;
		origemId: string | null;
		incluirNaAta: boolean;
	}) => void | Promise<void>;
	submitLabel: string;
	defaultValues?: Partial<GeneralReportFormValues>;
	disabled?: boolean;
	serverError?: string | null;
}) {
	const { data: participants = [] } = useParticipants(meetingId);
	const { getParticipantName } = useParticipantName();
	const form = useForm<GeneralReportFormValues>({
		resolver: zodResolver(generalReportSchema),
		defaultValues: {
			texto: "",
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
					name="origemId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Autor participante</FormLabel>
							<FormControl>
								<Select
									value={field.value}
									onValueChange={field.onChange}
									disabled={disabled}
								>
									<SelectTrigger aria-label="Autor do relato">
										<SelectValue placeholder="Selecione o participante" />
									</SelectTrigger>
									<SelectContent>
										{participants.map((participant) => (
											<SelectItem
												key={participant.id}
												value={participant.staffId}
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
