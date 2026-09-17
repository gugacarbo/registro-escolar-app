import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DataTable } from "#/components/data-table";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
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
import { PageHeader, PageShell } from "#/components/ui/page";
import { useCreateMinuteTemplate } from "#/hooks/minutes/use-create-minute-template";
import { useMinuteTemplates } from "#/hooks/minutes/use-minute-templates";
import type { MinuteTemplate } from "#/lib/minutes/schema";

export const Route = createFileRoute("/_app/minutes/templates/")({
	component: MinuteTemplatesPage,
});

function hasRichContent(
	value: string | Record<string, unknown> | null | undefined,
): boolean {
	if (!value) return false;
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value) as Record<string, unknown>;
			return hasRichContent(parsed);
		} catch {
			return value.trim().length > 0;
		}
	}
	const content = value.content;
	if (!Array.isArray(content)) return false;
	return content.some((node: unknown) => {
		if (typeof node !== "object" || node === null) return false;
		const n = node as { type?: string; content?: unknown[]; text?: string };
		if (n.text) return true;
		if (Array.isArray(n.content))
			return hasRichContent(n as Record<string, unknown>);
		return false;
	});
}

const columns = [
	{
		header: "Nome",
		cell: (template: MinuteTemplate) => template.name,
	},
	{
		header: "Personalização",
		cell: (template: MinuteTemplate) =>
			[
				hasRichContent(template.headerContent) && "Cabeçalho",
				hasRichContent(template.bodyContent) && "Conteúdo",
				hasRichContent(template.footerContent) && "Rodapé",
			]
				.filter(Boolean)
				.join(" · ") || "Padrão",
	},
];

const newTemplateSchema = z.object({
	name: z.string().trim().min(1, "Nome é obrigatório"),
});

type NewTemplateValues = z.infer<typeof newTemplateSchema>;

function NewTemplateDialogForm({
	onSubmit,
	submitLabel,
	serverError,
}: {
	onSubmit: (values: NewTemplateValues) => void | Promise<void>;
	submitLabel: string;
	serverError?: string | null;
}) {
	const form = useForm<NewTemplateValues>({
		resolver: zodResolver(newTemplateSchema),
		defaultValues: { name: "" },
	});

	return (
		<Form {...form}>
			<FormNative
				onSubmit={() => form.handleSubmit(onSubmit)()}
				className="space-y-4"
			>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Nome *</FormLabel>
							<FormControl>
								<Input {...field} autoFocus placeholder="Modelo padrão" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{serverError && (
					<p className="text-sm text-destructive">{serverError}</p>
				)}
				<FormSubmit className="w-full">{submitLabel}</FormSubmit>
			</FormNative>
		</Form>
	);
}

function MinuteTemplatesPage() {
	const [showCreateDialog, setShowCreateDialog] = useState(false);
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
					<Button variant="secondary" onClick={() => setShowCreateDialog(true)}>
						Novo modelo
					</Button>
				}
			/>

			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Novo modelo de ata</DialogTitle>
						<DialogDescription>
							Dê um nome ao modelo. Cabeçalho, conteúdo e rodapé são
							configurados na edição, após a criação.
						</DialogDescription>
					</DialogHeader>
					<NewTemplateDialogForm
						submitLabel={create.isPending ? "Salvando..." : "Criar modelo"}
						serverError={create.error?.message ?? null}
						onSubmit={(values) =>
							create.mutate(values, {
								onSuccess: () => setShowCreateDialog(false),
							})
						}
					/>
				</DialogContent>
			</Dialog>

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
					<Button size="sm" onClick={() => setShowCreateDialog(true)}>
						Novo modelo
					</Button>
				}
			/>
		</PageShell>
	);
}
