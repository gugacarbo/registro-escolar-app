import type { ReactNode } from "react";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "#/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";

export type DataTableColumn<TData> = {
	header: string;
	cell: (row: TData) => ReactNode;
};

export type DataTableProps<TData> = {
	columns: DataTableColumn<TData>[];
	rows: TData[];
	getRowKey: (row: TData) => string;
	total: number;
	page: number;
	pageSize: number;
	pageSizeOptions?: number[];
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	isLoading?: boolean;
	isError?: boolean;
	errorMessage?: string;
	emptyTitle: string;
	emptyDescription?: string;
	ariaLabel?: string;
};

function getVisiblePages(
	page: number,
	totalPages: number,
): (number | "ellipsis")[] {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}
	const window = [page - 1, page, page + 1].filter(
		(p) => p > 1 && p < totalPages,
	);
	const pages: (number | "ellipsis")[] = [1];
	if (window[0] !== undefined && window[0] > 2) {
		pages.push("ellipsis");
	}
	pages.push(...window);
	if (
		window[window.length - 1] !== undefined &&
		window[window.length - 1]! < totalPages - 1
	) {
		pages.push("ellipsis");
	}
	pages.push(totalPages);
	return pages;
}

export function DataTable<TData>({
	columns,
	rows,
	getRowKey,
	total,
	page,
	pageSize,
	pageSizeOptions = [10, 20, 50],
	onPageChange,
	onPageSizeChange,
	isLoading = false,
	isError = false,
	errorMessage = "Falha ao carregar os dados",
	emptyTitle,
	emptyDescription,
	ariaLabel = "Tabela de resultados",
}: DataTableProps<TData>) {
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, total);

	return (
		<div className="space-y-4">
			<Table aria-label={ariaLabel}>
				<TableHeader>
					<TableRow>
						{columns.map((column) => (
							<TableHead key={column.header}>{column.header}</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading &&
						Array.from({ length: pageSize }, (_, i) => (
							<TableRow key={`skeleton-${i}`}>
								{columns.map((column) => (
									<TableCell key={column.header}>
										<Skeleton className="h-4 w-full" />
									</TableCell>
								))}
							</TableRow>
						))}
					{!isLoading &&
						rows.map((row) => (
							<TableRow key={getRowKey(row)}>
								{columns.map((column) => (
									<TableCell key={column.header}>{column.cell(row)}</TableCell>
								))}
							</TableRow>
						))}
				</TableBody>
			</Table>

			{!isLoading && isError && (
				<p className="text-sm text-destructive" role="alert">
					{errorMessage}
				</p>
			)}

			{!isLoading && !isError && rows.length === 0 && (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>{emptyTitle}</EmptyTitle>
						{emptyDescription && (
							<EmptyDescription>{emptyDescription}</EmptyDescription>
						)}
					</EmptyHeader>
				</Empty>
			)}

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-muted-foreground" role="status">
					{total === 0
						? "Nenhum registro encontrado"
						: `Mostrando ${from}–${to} de ${total}`}
				</p>
				<div className="flex items-center gap-3">
					<Select
						value={String(pageSize)}
						onValueChange={(value) => onPageSizeChange(Number(value))}
						aria-label="Itens por página"
					>
						<SelectTrigger size="sm" aria-label="Itens por página">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{pageSizeOptions.map((option) => (
								<SelectItem key={option} value={String(option)}>
									{option} / página
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Pagination className="mx-0 w-auto">
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									href="#"
									aria-disabled={page <= 1}
									className={
										page <= 1 ? "pointer-events-none opacity-50" : undefined
									}
									onClick={(event) => {
										event.preventDefault();
										if (page > 1) {
											onPageChange(page - 1);
										}
									}}
								>
									<span className="hidden sm:block">Anterior</span>
								</PaginationPrevious>
							</PaginationItem>
							{getVisiblePages(page, totalPages).map((visible, index) =>
								visible === "ellipsis" ? (
									<PaginationItem key={`ellipsis-${index}`}>
										<PaginationEllipsis />
									</PaginationItem>
								) : (
									<PaginationItem key={visible}>
										<PaginationLink
											href="#"
											isActive={visible === page}
											onClick={(event) => {
												event.preventDefault();
												onPageChange(visible);
											}}
										>
											{visible}
										</PaginationLink>
									</PaginationItem>
								),
							)}
							<PaginationItem>
								<PaginationNext
									href="#"
									aria-disabled={page >= totalPages}
									className={
										page >= totalPages
											? "pointer-events-none opacity-50"
											: undefined
									}
									onClick={(event) => {
										event.preventDefault();
										if (page < totalPages) {
											onPageChange(page + 1);
										}
									}}
								>
									<span className="hidden sm:block">Próxima</span>
								</PaginationNext>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			</div>
		</div>
	);
}
