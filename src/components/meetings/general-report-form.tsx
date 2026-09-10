import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useParticipantName } from "#/components/meetings/participant-name";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormDescription,
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

const DRAFT_KEY_PREFIX = "council-general-report-draft:";

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
	draftKey,
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
	/** Habilita rascunho automático (autosave) no localStorage. Omita em modo edição. */
	draftKey?: string;
}) {
	const { data: participants = [] } = useParticipants(meetingId);
	const { getParticipantName } = useParticipantName();
	const form = useForm<GeneralReportFormValues>({
		resolver: zodResolver(generalReportSchema),
		mode: "onTouched",
		defaultValues: {
			texto: "",
			origemId: "",
			incluirNaAta: true,
			...defaultValues,
		},
	});

	const draftStorageKey = draftKey ? `${DRAFT_KEY_PREFIX}${draftKey}` : null;
	const [draftRestored, setDraftRestored] = useState(false);

	// P2: restaura rascunho salvo (só em criação, nunca em edição).
	useEffect(() => {
		if (!draftStorageKey) {
			setDraftRestored(true);
			return;
		}
		try {
			const raw = localStorage.getItem(draftStorageKey);
			if (raw) {
				const draft = JSON.parse(raw) as Partial<GeneralReportFormValues>;
				if (draft.texto || draft.origemId) {
					form.reset({
						texto: "",
						origemId: "",
						incluirNaAta: true,
						...Object.fromEntries(
							Object.entries({
								texto: draft.texto,
								origemId: draft.origemId,
								incluirNaAta: draft.incluirNaAta,
							}).filter(([, value]) => value !== undefined),
						),
					});
				}
			}
		} catch {
			// rascunho corrompido: ignora e segue com valores padrão
		}
		setDraftRestored(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [draftStorageKey, form.reset]);

	const watchedValues = useWatch({
		control: form.control,
	}) as GeneralReportFormValues;

	// P2: autosave do rascunho a cada mudança.
	useEffect(() => {
		if (!draftStorageKey || !draftRestored) return;
		const timer = setTimeout(() => {
			try {
				if (watchedValues.texto || watchedValues.origemId) {
					localStorage.setItem(draftStorageKey, JSON.stringify(watchedValues));
				} else {
					localStorage.removeItem(draftStorageKey);
				}
			} catch {
				// storage indisponível: ignora
			}
		}, 500);
		return () => clearTimeout(timer);
	}, [watchedValues, draftStorageKey, draftRestored]);

	function handleClear() {
		if (!draftStorageKey) {
			form.reset();
			return;
		}
		try {
			localStorage.removeItem(draftStorageKey);
		} catch {
			// ignora
		}
		form.reset();
	}

	async function handleValidSubmit(values: GeneralReportFormValues) {
		await onSubmit({
			texto: values.texto,
			origemId: values.origemId || null,
			incluirNaAta: values.incluirNaAta,
		});
		if (!draftStorageKey) {
			form.reset();
			return;
		}
		try {
			localStorage.removeItem(draftStorageKey);
		} catch {
			// ignora
		}
		form.reset();
	}

	const textoLength = watchedValues.texto.length;
	const hasContent = Boolean(watchedValues.texto || watchedValues.origemId);

	return (
		<Form {...form}>
			<FormNative
				onSubmit={() => form.handleSubmit(handleValidSubmit)()}
				className="space-y-3"
			>
				<FormField
					control={form.control}
					name="texto"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Texto *</FormLabel>
							<FormControl>
								<Textarea
									{...field}
									disabled={disabled}
									rows={4}
									placeholder="Relato sobre a turma ou a reunião como um todo. Ex.: “Turma apresentou melhora em participação após projeto de leitura”."
								/>
							</FormControl>
							<FormDescription>
								Relatos gerais não pertencem a um estudante específico.
							</FormDescription>
							<p
								id={`${field.name}-counter`}
								className="text-xs text-muted-foreground"
								aria-live="polite"
							>
								{textoLength} caracteres
								{draftStorageKey &&
									hasContent &&
									" · rascunho salvo automaticamente"}
							</p>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="origemId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Quem observou (opcional)</FormLabel>
							<FormControl>
								<Select
									value={field.value}
									onValueChange={field.onChange}
									disabled={disabled}
								>
									<SelectTrigger aria-label="Quem observou">
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
									aria-describedby="incluir-ata-hint-report"
								/>
							</FormControl>
							<div>
								<FormLabel>Incluir na ata</FormLabel>
								<p
									id="incluir-ata-hint-report"
									className="text-xs text-muted-foreground"
								>
									Marcado: aparece na ata oficial. Desmarcado: só registro
									interno.
								</p>
							</div>
						</FormItem>
					)}
				/>
				{serverError && (
					<p className="text-sm text-destructive">{serverError}</p>
				)}
				<div className="flex items-center gap-2">
					<FormSubmit disabled={disabled}>{submitLabel}</FormSubmit>
					{hasContent ? (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button type="button" variant="outline">
									Limpar
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Descartar o que foi digitado?
									</AlertDialogTitle>
									<AlertDialogDescription>
										O texto e as seleções serão apagados. Esta ação não pode ser
										desfeita.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancelar</AlertDialogCancel>
									<AlertDialogAction onClick={handleClear}>
										Descartar
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : (
						<Button type="button" variant="outline" onClick={handleClear}>
							Limpar
						</Button>
					)}
				</div>
			</FormNative>
		</Form>
	);
}
