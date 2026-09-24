import { cn } from "cn";
import type * as React from "react";

/**
 * Estrutura compartilhada das páginas internas.
 * Evita headings, espaçamentos e hierarquias diferentes em cada rota.
 */
function PageShell({
	className,
	children,
	...props
}: React.ComponentProps<"section">) {
	return (
		<section
			data-slot="page-shell"
			className={cn("page-shell w-full space-y-6", className)}
			{...props}
		>
			{children}
		</section>
	);
}

function PageHeader({
	className,
	title,
	description,
	actions,
	children,
	...props
}: React.ComponentProps<"header"> & {
	title: React.ReactNode;
	description?: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<header
			data-slot="page-header"
			className={cn(
				"flex flex-row items-center justify-between gap-4 border-b-2 border-primary/15 pb-5",
				className,
			)}
			{...props}
		>
			<div className="min-w-0 space-y-2">
				<h1 className="font-display text-2xl leading-tight tracking-tight text-balance text-foreground sm:text-[2rem]">
					{title}
				</h1>
				{description && (
					<div className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
						{description}
					</div>
				)}
				{children}
			</div>
			{actions && (
				<div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
					{actions}
				</div>
			)}
		</header>
	);
}

function PageToolbar({
	className,
	children,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="page-toolbar"
			className={cn(
				"flex flex-col gap-3 rounded-lg border bg-card/70 p-3 shadow-xs backdrop-blur-sm sm:flex-row sm:items-center",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

function PageSection({
	className,
	title,
	description,
	actions,
	children,
	...props
}: React.ComponentProps<"section"> & {
	title: React.ReactNode;
	description?: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<section
			data-slot="page-section"
			className={cn(
				"space-y-4 rounded-lg border bg-card p-4 text-card-foreground shadow-xs sm:p-5",
				className,
			)}
			{...props}
		>
			<div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 space-y-1">
					<h2 className="font-display text-lg leading-snug tracking-tight">
						{title}
					</h2>
					{description && (
						<p className="max-w-2xl text-sm text-muted-foreground">
							{description}
						</p>
					)}
				</div>
				{actions && (
					<div className="flex flex-wrap items-center gap-2">{actions}</div>
				)}
			</div>
			{children}
		</section>
	);
}

export { PageHeader, PageSection, PageShell, PageToolbar };
