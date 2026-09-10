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
import { Input } from "#/components/ui/input";
import { SearchableSelect } from "#/components/ui/searchable-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { fetchComponentsPage } from "#/hooks/entity-fetchers";
import { useParticipants } from "#/hooks/meetings/use-participants";
import { useAsyncOptions } from "#/hooks/use-async-options";
import { useDebouncedValue } from "#/hooks/use-debounced-value";

const DRAFT_KEY_PREFIX = "council-record-draft:";

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
	draftKey,
}: {
	onSubmit: (values: RecordFormSubmitValues) => void | Promise<void>;
	submitLabel: string;
	defaultValues?: Partial<RecordFormValues>;
	disabled?: boolean;
	serverError?: string | null;
	meetingId: string;
	/** Habilita rascunho automático (autosave) no localStorage. Omita em modo edição. */
	draftKey?: string;
}) {
	const [componentSearch, setComponentSearch] = useState("");
	const debouncedComponentSearch = useDebouncedValue(componentSearch, 300);
	const { data: componentsResult, isLoading: isLoadingComponents } =
		useAsyncOptions({
			queryKey: ["record-form", "components"],
			search: debouncedComponentSearch,
			fetchPage: fetchComponentsPage,
			select: (component) => ({ id: component.id, name: component.name }),
		});
	const componentOptions = componentsResult ? componentsResult.options : [];
	const componentsHint =
		componentsResult && !componentsResult.loadedAll
			? `Mostrando ${componentOptions.length} de ${componentsResult.total}. Refine a busca para ver mais.`
			: undefined;
	const { data: participants = [] } = useParticipants(meetingId);
	const { getParticipantName } = useParticipantName();

	const draftStorageKey = draftKey ? `${DRAFT_KEY_PREFIX}${draftKey}` : null;
	const [draftRestored, setDraftRestored] = useState(false);

	const form = useForm<RecordFormValues>({
		resolver: zodResolver(recordFormSchema),
		mode: "onTouched",
		defaultValues: {
			texto: "",
			categoriaId: "",
			componenteId: "",
			origemId: "",
			incluirNaAta: true,
			...defaultValues,
		},
	});

	// P2: restaura rascunho salvo (só em criação, nunca em edição).
	useEffect(() => {
		if (!draftStorageKey) {
			setDraftRestored(true);
			return;
		}
		try {
			const raw = localStorage.getItem(draftStorageKey);
			if (raw) {
				const draft = JSON.parse(raw) as Partial<RecordFormValues>;
				if (
					draft.texto ||
					draft.categoriaId ||
					draft.componenteId ||
					draft.origemId
				) {
					const restored = {
						texto: "",
						categoriaId: "",
						componenteId: "",
						origemId: "",
						incluirNaAta: true,
						...Object.fromEntries(
							Object.entries({
								texto: draft.texto,
								categoriaId: draft.categoriaId,
								componenteId: draft.componenteId,
								origemId: draft.origemId,
								incluirNaAta: draft.incluirNaAta,
							}).filter(([, value]) => value !== undefined),
						),
					};
					form.reset(restored);
				}
			}
		} catch {
			// rascunho corrompido: ignora e segue com valores padrão
		}
		setDraftRestored(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [draftStorageKey, form.reset]);

	const watchedValues = useWatch({ control: form.control }) as RecordFormValues;

	// P2: autosave do rascunho a cada mudança (debounce via texto).
	useEffect(() => {
		if (!draftStorageKey || !draftRestored) return;
		const timer = setTimeout(() => {
			try {
				if (
					watchedValues.texto ||
					watchedValues.categoriaId ||
					watchedValues.componenteId
				) {
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

	function clearDraft() {
		if (!draftStorageKey) return;
		try {
			localStorage.removeItem(draftStorageKey);
		} catch {
			// ignora
		}
	}

	const textoLength = watchedValues.texto.length;
	const hasContent = Boolean(
		watchedValues.texto ||
			watchedValues.categoriaId ||
			watchedValues.componenteId,
	);

	async function handleValidSubmit(values: RecordFormValues) {
		await onSubmit({
			texto: values.texto,
			categoriaId: values.categoriaId || null,
			componenteId: values.componenteId || null,
			origemId: values.origemId || null,
			incluirNaAta: values.incluirNaAta,
		});
		clearDraft();
		form.reset();
	}

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
									placeholder="Descreva o fato observado, sem juízo de valor. Ex.: “Estudante apresentou dificuldade em frações nas últimas 3 aulas”."
								/>
							</FormControl>
							<FormDescription>
								Seja objetivo: o que aconteceu, quando e em qual contexto.
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
				<div className="grid gap-3 sm:grid-cols-2">
					<FormField
						control={form.control}
						name="categoriaId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Categoria (opcional)</FormLabel>
								<FormControl>
									<Input
										{...field}
										disabled={disabled}
										placeholder="Ex.: Comportamento, Aprendizagem"
									/>
								</FormControl>
								<FormDescription>
									Etiqueta livre para agrupar registros na ata.
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="componenteId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Componente curricular (opcional)</FormLabel>
								<FormControl>
									<SearchableSelect
										label="Componente curricular"
										placeholder="Selecione o componente"
										value={field.value}
										onChange={field.onChange}
										options={componentOptions}
										isLoading={isLoadingComponents}
										hint={componentsHint}
										search={componentSearch}
										onSearchChange={setComponentSearch}
										disabled={disabled}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
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
									aria-describedby="incluir-ata-hint"
								/>
							</FormControl>
							<div>
								<FormLabel>Incluir na ata</FormLabel>
								<p
									id="incluir-ata-hint"
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
									<AlertDialogAction
										onClick={() => {
											clearDraft();
											form.reset();
										}}
									>
										Descartar
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : (
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								clearDraft();
								form.reset();
							}}
						>
							Limpar
						</Button>
					)}
				</div>
			</FormNative>
		</Form>
	);
}
