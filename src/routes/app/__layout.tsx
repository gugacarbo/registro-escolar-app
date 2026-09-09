import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/app/__layout")({
	component: AppLayout,
});

function AppLayout() {
	const [session, setSession] = useState<
		Awaited<ReturnType<typeof authClient.getSession>>["data"] | null | undefined
	>(undefined);

	useEffect(() => {
		authClient
			.getSession()
			.then(({ data }) => setSession(data))
			.catch(() => setSession(null));
	}, []);

	if (session === undefined) {
		return (
			<div className="flex h-screen items-center justify-center">
				Carregando...
			</div>
		);
	}

	if (!session) {
		window.location.href = "/api/auth/sign-in";
		return null;
	}

	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto p-4">
				<Outlet />
			</main>
		</div>
	);
}
