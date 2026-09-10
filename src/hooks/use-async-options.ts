import { useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "#/hooks/use-debounced-value";

export type EntityOption = { id: string; name: string };

export type PaginatedFetcher<TItem extends { id: string }> = (params: {
	search?: string;
	page: number;
	pageSize: number;
}) => Promise<{ data: TItem[]; total: number }>;

/**
 * Agrega páginas de um endpoint paginado com busca, evitando truncar
 * silenciosamente listas grandes nos selects de formulário. A API limita
 * `pageSize` a 100 linhas, por isso percorre até `maxPages` páginas.
 */
export function useAsyncOptions<TItem extends { id: string }>({
	queryKey,
	search,
	pageSize = 100,
	maxPages = 10,
	fetchPage,
	select,
	staleTime = 30_000,
	gcTime = 5 * 60_000,
}: {
	queryKey: readonly unknown[];
	search?: string;
	pageSize?: number;
	maxPages?: number;
	fetchPage: PaginatedFetcher<TItem>;
	select: (item: TItem) => EntityOption;
	staleTime?: number;
	gcTime?: number;
}) {
	const debouncedSearch = useDebouncedValue(search ?? "", 300);
	return useQuery<{
		options: EntityOption[];
		total: number;
		loadedAll: boolean;
		isSearching: boolean;
	}>({
		queryKey: [...queryKey, { search: debouncedSearch, pageSize, maxPages }],
		queryFn: async () => {
			const options: EntityOption[] = [];
			let page = 1;
			let total = 0;
			let loadedAll = false;
			while (page <= maxPages) {
				const result = await fetchPage({
					search: debouncedSearch || undefined,
					page,
					pageSize,
				});
				total = result.total;
				for (const item of result.data) {
					options.push(select(item));
				}
				if (options.length >= total || result.data.length < pageSize) {
					loadedAll = true;
					break;
				}
				page += 1;
			}
			return {
				options,
				total,
				loadedAll,
				isSearching: debouncedSearch.length > 0,
			};
		},
		staleTime,
		gcTime,
	});
}
