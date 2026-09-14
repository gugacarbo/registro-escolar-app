import { useInfiniteQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "#/hooks/use-debounced-value";

export type InfiniteAsyncOption = {
	id: string;
	name: string;
	reference?: string | null;
	[key: string]: unknown;
};

export type PaginatedFetcher<TItem extends { id: string }> = (params: {
	search?: string;
	page: number;
	pageSize: number;
}) => Promise<{ data: TItem[]; total: number }>;

export function useInfiniteAsyncOptions<
	TItem extends { id: string },
	TOption extends InfiniteAsyncOption = InfiniteAsyncOption,
>({
	queryKey,
	search,
	pageSize = 20,
	fetchPage,
	select,
	staleTime = 30_000,
	gcTime = 5 * 60_000,
	enabled = true,
}: {
	queryKey: readonly unknown[];
	search?: string;
	pageSize?: number;
	fetchPage: PaginatedFetcher<TItem>;
	select: (item: TItem) => TOption;
	staleTime?: number;
	gcTime?: number;
	enabled?: boolean;
}) {
	const debouncedSearch = useDebouncedValue(search ?? "", 300);

	const query = useInfiniteQuery({
		queryKey: [...queryKey, { search: debouncedSearch, pageSize }],
		enabled,
		initialPageParam: 1,
		queryFn: async ({ pageParam = 1 }) => {
			return fetchPage({
				search: debouncedSearch || undefined,
				page: pageParam as number,
				pageSize,
			});
		},
		getNextPageParam: (lastPage, allPages) => {
			const totalLoaded = allPages.reduce(
				(acc, page) => acc + page.data.length,
				0,
			);
			if (totalLoaded < lastPage.total && lastPage.data.length > 0) {
				return allPages.length + 1;
			}
			return undefined;
		},
		staleTime,
		gcTime,
	});

	const options: TOption[] = [];
	if (query.data?.pages) {
		for (const page of query.data.pages) {
			for (const item of page.data) {
				options.push(select(item));
			}
		}
	}

	const total = query.data?.pages[0]?.total ?? 0;
	const isSearching = debouncedSearch.length > 0;

	return {
		options,
		total,
		isSearching,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isFetchingNextPage: query.isFetchingNextPage,
		hasNextPage: Boolean(query.hasNextPage),
		fetchNextPage: query.fetchNextPage,
		refetch: query.refetch,
	};
}
