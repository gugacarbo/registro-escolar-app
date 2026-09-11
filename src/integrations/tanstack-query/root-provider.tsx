import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
}

export function getContext() {
	const queryClient = createQueryClient();

	return {
		queryClient,
	};
}
export default function TanstackQueryProvider() {}
