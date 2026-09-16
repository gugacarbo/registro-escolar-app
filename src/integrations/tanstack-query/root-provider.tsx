import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Sem retry global: 404s de rota (ex.: id de reunião inválido)
				// não devem ser retratados; o app exibe erro inline com ação de
				// retry nos pontos críticos.
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
