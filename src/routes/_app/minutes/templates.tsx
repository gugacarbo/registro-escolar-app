import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { MinuteTemplateForm } from "#/components/minutes/minute-template-form";
import { Button } from "#/components/ui/button";
import { PageShell } from "#/components/ui/page";
import { useCreateMinuteTemplate } from "#/hooks/minutes/use-create-minute-template";
import { useMinuteTemplates } from "#/hooks/minutes/use-minute-templates";

export const Route = createFileRoute("/_app/minutes/templates")({
	component: MinuteTemplatesPage,
});

function MinuteTemplatesPage() {
	const [showForm, setShowForm] = useState(false);
	const { data: templates, isLoading } = useMinuteTemplates();
	const create = useCreateMinuteTemplate();

	return (
		<PageShell>
			<div className="flex items-center justify-between">
				<h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem]">
					Modelos de ata
				</h1>
				<Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
					{showForm ? "Fechar" : "Novo modelo"}
				</Button>
			</div>

			{showForm && (
				<div className="max-w-lg rounded border p-3">
					<MinuteTemplateForm
						submitLabel={create.isPending ? "Salvando..." : "Criar modelo"}
						serverError={create.error?.message ?? null}
						onSubmit={(values) =>
							create.mutate(
								{
									...values,
									headerText: values.headerText ?? "",
									footerText: values.footerText ?? "",
								},
								{
									onSuccess: () => setShowForm(false),
								},
							)
						}
					/>
				</div>
			)}

			{isLoading && <p>Carregando...</p>}
			{templates && templates.length === 0 && <p>Nenhum modelo cadastrado.</p>}
			{templates && templates.length > 0 && (
				<ul className="space-y-2">
					{templates.map((template) => (
						<li key={template.id} className="rounded border p-2">
							<p className="font-medium">{template.name}</p>
							<p className="text-sm text-muted-foreground">
								{[
									template.showMeeting && "Reunião",
									template.showClasses && "Turmas",
									template.showParticipants && "Participantes",
									template.showRecords && "Registros",
									template.showGeneralReports && "Relatos",
									template.showSignatures && "Assinaturas",
								]
									.filter(Boolean)
									.join(" · ") || "Nenhum bloco"}
							</p>
						</li>
					))}
				</ul>
			)}
		</PageShell>
	);
}
