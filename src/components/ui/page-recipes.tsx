import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
import type * as React from "react";

import { Button } from "#/components/ui/button";
import { PageHeader, PageShell } from "#/components/ui/page";
import {
	ErrorFeedback,
	LoadingFeedback,
} from "#/components/ui/status-feedback";

/**
 * Receita de página de listagem: PageShell + PageHeader com slots tipados
 * para toolbar e conteúdo. O conteúdo (ex.: DataTable) vem por children;
 * a toolbar é composta pelo consumidor (PageToolbar + SearchInput + Select).
 */
function ListPage({
	title,
	actions,
	toolbar,
	children,
	className,
	...props
}: React.ComponentProps<"section"> & {
	title: React.ReactNode;
	actions?: React.ReactNode;
	toolbar?: React.ReactNode;
}) {
	return (
		<PageShell className={className} {...props}>
			<PageHeader title={title} actions={actions} />
			{toolbar && <div data-slot="list-page-toolbar">{toolbar}</div>}
			{children}
		</PageShell>
	);
}

function BackLink({ backTo }: { backTo: { to: string; label: string } }) {
	return (
		<div>
			<a href={backTo.to} className="inline-flex">
				<Button variant="ghost" size="sm" asChild>
					<span>
						<ArrowLeft className="size-4" aria-hidden />
						{backTo.label}
					</span>
				</Button>
			</a>
		</div>
	);
}

/**
 * Receita de página de detalhe: PageShell + botão voltar + PageHeader,
 * com estados de carregamento e erro padronizados antes do conteúdo.
 */
function DetailPage({
	title,
	backTo,
	actions,
	isLoading,
	error,
	children,
	className,
	...props
}: React.ComponentProps<"section"> & {
	title: React.ReactNode;
	backTo?: { to: string; label: string };
	actions?: React.ReactNode;
	isLoading?: boolean;
	error?: React.ReactNode;
}) {
	return (
		<PageShell className={className} {...props}>
			{backTo && <BackLink backTo={backTo} />}
			<PageHeader title={title} actions={actions} />
			{isLoading ? (
				<LoadingFeedback data-slot="detail-page-loading" />
			) : error ? (
				<ErrorFeedback data-slot="detail-page-error">{error}</ErrorFeedback>
			) : (
				children
			)}
		</PageShell>
	);
}

/**
 * Receita de página de formulário: PageShell com largura narrow
 * (max-w-2xl centralizado), botão voltar e PageHeader antes do form.
 */
function FormPage({
	title,
	description,
	backTo,
	actions,
	children,
	className,
	...props
}: React.ComponentProps<"section"> & {
	title: React.ReactNode;
	description?: React.ReactNode;
	backTo?: { to: string; label: string };
	actions?: React.ReactNode;
}) {
	return (
		<PageShell className={cn("mx-auto max-w-2xl", className)} {...props}>
			{backTo && <BackLink backTo={backTo} />}
			<PageHeader title={title} description={description} actions={actions} />
			{children}
		</PageShell>
	);
}

export { DetailPage, FormPage, ListPage };
