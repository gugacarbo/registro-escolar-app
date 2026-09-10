import { SearchX, TriangleAlert } from "lucide-react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
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
	header: ReactNode;
	cell: (row: TData) => ReactNode;
	align?: "left" | "center" | "right";
	key?: string;
	skeletonClassName?: string;
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
	emptyAction?: ReactNode;
	onRetry?: () => void;
	retryLabel?: string;
	ariaLabel?: string;
	onRowClick?: (row: TData) => void;
};

const INTERACTIVE_ROW_SELECTOR =
	'a,button,input,select,textarea,[role="button"],[data-no-row-click]';

const CLICKABLE_ROW_CLASS_NAME =
	"cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function isRowEventIgnored(
	event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>,
): boolean {
	return (event.target as Element).closest(INTERACTIVE_ROW_SELECTOR) !== null;
}

function handleRowClick<TData>(
	event: MouseEvent<HTMLTableRowElement>,
	row: TData,
	onRowClick: (row: TData) => void,
): void {
	if (isRowEventIgnored(event)) {
		return;
	}
	onRowClick(row);
}

function handleRowKeyDown<TData>(
	event: KeyboardEvent<HTMLTableRowElement>,
	row: TData,
	onRowClick: (row: TData) => void,
): void {
	if (event.key !== "Enter" && event.key !== " ") {
		return;
	}
	if (isRowEventIgnored(event)) {
		return;
	}
	event.preventDefault();
	onRowClick(row);
}

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
	const first = window[0];
	if (first !== undefined && first > 2) {
		pages.push("ellipsis");
	}
	pages.push(...window);
	const last = window[window.length - 1];
	if (last !== undefined && last < totalPages - 1) {
		pages.push("ellipsis");
	}
	pages.push(totalPages);
	return pages;
}

const alignClassName: Record<
	NonNullable<DataTableColumn<unknown>["align"]>,
	string
> = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
};

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
	emptyAction,
	onRetry,
	retryLabel = "Tentar novamente",
	ariaLabel = "Tabela de resultados",
	onRowClick,
}: DataTableProps<TData>) {
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, total);

	return (
		<div className="overflow-hidden rounded-xl border bg-card shadow-xs">
			<div className="overflow-x-auto">
				<Table aria-label={ariaLabel}>
					<TableHeader>
						<TableRow className="bg-muted/60 hover:bg-muted/60">
							{columns.map((column, index) => (
								<TableHead
									key={
										column.key ??
										(typeof column.header === "string"
											? column.header
											: `col-${index}`)
									}
									className={
										column.align
											? alignClassName[column.align]
											: index === 0
												? "pl-4 text-left sm:pl-5"
												: index === columns.length - 1
													? "pr-4 text-right sm:pr-5"
													: "text-left"
									}
								>
									{column.header}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading &&
							Array.from({ length: pageSize }, (_, i) => (
								<TableRow
									key={`skeleton-${i}`}
									className="hover:bg-transparent"
								>
									{columns.map((column, index) => (
										<TableCell
											key={
												column.key ??
												(typeof column.header === "string"
													? column.header
													: `col-${index}`)
											}
											className={
												column.align
													? alignClassName[column.align]
													: index === 0
														? "pl-4 sm:pl-5"
														: index === columns.length - 1
															? "pr-4 sm:pr-5"
															: undefined
											}
										>
											<Skeleton
												className={
													column.skeletonClassName ?? "h-4 w-full max-w-56"
												}
											/>
										</TableCell>
									))}
								</TableRow>
							))}
						{!isLoading &&
							rows.map((row) => (
								<TableRow
									key={getRowKey(row)}
									tabIndex={onRowClick ? 0 : undefined}
									className={onRowClick ? CLICKABLE_ROW_CLASS_NAME : undefined}
									onClick={
										onRowClick
											? (event) => handleRowClick(event, row, onRowClick)
											: undefined
									}
									onKeyDown={
										onRowClick
											? (event) => handleRowKeyDown(event, row, onRowClick)
											: undefined
									}
								>
									{columns.map((column, index) => (
										<TableCell
											key={
												column.key ??
												(typeof column.header === "string"
													? column.header
													: `col-${index}`)
											}
											className={
												column.align
													? alignClassName[column.align]
													: index === 0
														? "pl-4 font-normal sm:pl-5"
														: index === columns.length - 1
															? "pr-4 sm:pr-5"
															: undefined
											}
										>
											{column.cell(row)}
										</TableCell>
									))}
								</TableRow>
							))}
					</TableBody>
				</Table>
			</div>

			{!isLoading && isError && (
				<div className="border-t p-4 sm:p-5">
					<Alert variant="destructive">
						<TriangleAlert />
						<AlertTitle>Falha ao carregar os dados</AlertTitle>
						<AlertDescription className="w-full">
							<p>{errorMessage}</p>
							{onRetry && (
								<Button
									variant="outline"
									size="sm"
									className="mt-2 w-fit"
									onClick={onRetry}
								>
									{retryLabel}
								</Button>
							)}
						</AlertDescription>
					</Alert>
				</div>
			)}

			{!isLoading && !isError && rows.length === 0 && (
				<div className="border-t p-4 sm:p-5">
					<Empty className="border-none p-6 md:p-10">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<SearchX />
							</EmptyMedia>
							<EmptyTitle>{emptyTitle}</EmptyTitle>
							{emptyDescription && (
								<EmptyDescription>{emptyDescription}</EmptyDescription>
							)}
						</EmptyHeader>
						{emptyAction && <EmptyContent>{emptyAction}</EmptyContent>}
					</Empty>
				</div>
			)}

			<div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
				<p className="text-sm text-muted-foreground" role="status">
					{total === 0
						? "Nenhum registro encontrado"
						: `Mostrando ${from}–${to} de ${total}`}
				</p>
				<div className="flex flex-wrap items-center gap-3">
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
									aria-label="Página anterior"
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
									aria-label="Próxima página"
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
