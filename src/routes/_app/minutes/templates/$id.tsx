import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
	MinuteTemplateForm,
	type MinuteTemplateFormValues,
} from "#/components/minutes/minute-template-form";
import { Button } from "#/components/ui/button";
import { PageHeader, PageShell } from "#/components/ui/page";
import { useMinuteTemplate } from "#/hooks/minutes/use-minute-template";
import { useUpdateMinuteTemplate } from "#/hooks/minutes/use-update-minute-template";
import {
	defaultMinuteBodyContent,
	emptyDoc,
} from "#/lib/minutes/tiptap/serializer";

export const Route = createFileRoute("/_app/minutes/templates/$id")({
	component: MinuteTemplateDetailPage,
});

function parseTemplateContent(
	value: string | object | null | undefined,
): Record<string, unknown> {
	if (!value) return emptyDoc() as Record<string, unknown>;
	if (typeof value === "string") {
		try {
			return JSON.parse(value) as Record<string, unknown>;
		} catch {
			return emptyDoc() as Record<string, unknown>;
		}
	}
	return value as Record<string, unknown>;
}

export default function MinuteTemplateDetailPage() {
	const { id } = Route.useParams();
	const { data: template, isLoading, isError, error } = useMinuteTemplate(id);
	const update = useUpdateMinuteTemplate(id);
	const [serverError, setServerError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	async function handleSubmit(values: MinuteTemplateFormValues) {
		setServerError(null);
		setSaved(false);
		try {
			await update.mutateAsync(values);
			setSaved(true);
		} catch (submitError) {
			setServerError(
				submitError instanceof Error
					? submitError.message
					: "Falha ao atualizar preset de ata",
			);
		}
	}

	return (
		<PageShell>
			<PageHeader
				eyebrow="Configuração"
				title={template?.name ?? "Editar preset de ata"}
				actions={
					<Link to="/minutes/templates">
						<Button variant="secondary">Voltar para a lista</Button>
					</Link>
				}
			/>
			{isLoading && <p>Carregando...</p>}
			{isError && (
				<p className="text-sm text-destructive">
					{error instanceof Error
						? error.message
						: "Falha ao carregar preset de ata"}
				</p>
			)}
			{template && (
				<>
					{saved && (
						<p className="text-sm text-muted-foreground" role="status">
							Preset atualizado
						</p>
					)}
					<MinuteTemplateForm
						key={template.id + String(template.updatedAt)}
						defaultValues={{
							name: template.name,
							headerContent: parseTemplateContent(template.headerContent),
							bodyContent:
								template.bodyContent != null
									? parseTemplateContent(template.bodyContent)
									: defaultMinuteBodyContent({
											showMeeting: template.showMeeting,
											showClasses: template.showClasses,
											showParticipants: template.showParticipants,
											showRecords: template.showRecords,
											showGeneralReports: template.showGeneralReports,
											showSignatures: template.showSignatures,
										}),
							footerContent: parseTemplateContent(template.footerContent),
						}}
						onSubmit={handleSubmit}
						submitLabel={update.isPending ? "Salvando..." : "Salvar alterações"}
						serverError={serverError}
					/>
				</>
			)}
		</PageShell>
	);
}
