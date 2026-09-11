import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable } from "#/components/data-table";
import { MinuteTemplateForm } from "#/components/minutes/minute-template-form";
import { Button } from "#/components/ui/button";
import { PageHeader, PageShell } from "#/components/ui/page";
import { useCreateMinuteTemplate } from "#/hooks/minutes/use-create-minute-template";
import { useMinuteTemplates } from "#/hooks/minutes/use-minute-templates";
import type { MinuteTemplate } from "#/lib/minutes/schema";

export const Route = createFileRoute("/_app/minutes/templates/")({
	component: MinuteTemplatesPage,
});

const columns = [
	{
		header: "Nome",
		cell: (template: MinuteTemplate) => template.name,
	},
	{
		header: "Blocos",
		cell: (template: MinuteTemplate) =>
			[
				template.showMeeting && "Reunião",
				template.showClasses && "Turmas",
				template.showParticipants && "Participantes",
				template.showRecords && "Registros",
				template.showGeneralReports && "Relatos",
				template.showSignatures && "Assinaturas",
			]
				.filter(Boolean)
				.join(" · ") || "Nenhum bloco",
	},
];

function MinuteTemplatesPage() {
	const [showForm, setShowForm] = useState(false);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const {
		data: templates,
		isLoading,
		isError,
		error,
		refetch,
	} = useMinuteTemplates();
	const create = useCreateMinuteTemplate();
	const navigate = useNavigate();
	const rows = (templates ?? []).slice((page - 1) * pageSize, page * pageSize);

	return (
		<PageShell>
			<PageHeader
				eyebrow="Configuração"
				title="Modelos de ata"
				description="Cadastre e mantenha os modelos usados para gerar atas."
				actions={
					<Button
						variant="secondary"
						onClick={() => setShowForm((value) => !value)}
					>
						{showForm ? "Fechar" : "Novo modelo"}
					</Button>
				}
			/>

			{showForm && (
				<div className="max-w-lg rounded border p-3">
					<MinuteTemplateForm
						submitLabel={create.isPending ? "Salvando..." : "Criar modelo"}
						serverError={create.error?.message ?? null}
						onSubmit={(values) =>
							create.mutate(values, { onSuccess: () => setShowForm(false) })
						}
					/>
				</div>
			)}

			<DataTable
				columns={columns}
				rows={rows}
				getRowKey={(template) => template.id}
				total={templates?.length ?? 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(size) => {
					setPageSize(size);
					setPage(1);
				}}
				onRowClick={(template) =>
					navigate({
						to: "/minutes/templates/$id",
						params: { id: template.id },
					})
				}
				isLoading={isLoading}
				isError={isError}
				errorMessage={error instanceof Error ? error.message : undefined}
				onRetry={() => refetch()}
				ariaLabel="Tabela de modelos de ata"
				emptyTitle="Nenhum modelo cadastrado"
				emptyDescription="Cadastre um modelo para usar na geração das atas."
				emptyAction={
					<Button size="sm" onClick={() => setShowForm(true)}>
						Novo modelo
					</Button>
				}
			/>
		</PageShell>
	);
}
