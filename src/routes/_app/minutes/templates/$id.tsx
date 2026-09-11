import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
	MinuteTemplateForm,
	type MinuteTemplateFormValues,
} from "#/components/minutes/minute-template-form";
import { Button } from "#/components/ui/button";
import { PageShell } from "#/components/ui/page";
import { useMinuteTemplate } from "#/hooks/minutes/use-minute-template";
import { useUpdateMinuteTemplate } from "#/hooks/minutes/use-update-minute-template";

export const Route = createFileRoute("/_app/minutes/templates/$id")({
	component: MinuteTemplateDetailPage,
});

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
					: "Falha ao atualizar template de ata",
			);
		}
	}

	return (
		<PageShell>
			<div className="flex items-center justify-between gap-2">
				<h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem]">
					{template?.name ?? "Editar modelo de ata"}
				</h1>
				<Link to="/minutes/templates">
					<Button variant="secondary">Voltar para a lista</Button>
				</Link>
			</div>
			{isLoading && <p>Carregando...</p>}
			{isError && (
				<p className="text-sm text-destructive">
					{error instanceof Error
						? error.message
						: "Falha ao carregar template de ata"}
				</p>
			)}
			{template && (
				<>
					{saved && (
						<p className="text-sm text-muted-foreground" role="status">
							Modelo atualizado
						</p>
					)}
					<MinuteTemplateForm
						key={template.id}
						defaultValues={{
							name: template.name,
							headerText: template.headerText,
							footerText: template.footerText,
							showMeeting: template.showMeeting,
							showClasses: template.showClasses,
							showParticipants: template.showParticipants,
							showRecords: template.showRecords,
							showGeneralReports: template.showGeneralReports,
							showSignatures: template.showSignatures,
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
