import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});

type SessionData = Awaited<ReturnType<typeof authClient.getSession>>["data"];

export function AppLayout() {
	const navigate = useNavigate();
	const [session, setSession] = useState<SessionData | null | undefined>(
		undefined,
	);

	useEffect(() => {
		let active = true;

		authClient
			.getSession()
			.then(({ data }) => {
				if (!active) return;
				if (data) {
					setSession(data);
				} else {
					void navigate({ to: "/login" });
				}
			})
			.catch(() => {
				if (active) void navigate({ to: "/login" });
			});

		return () => {
			active = false;
		};
	}, [navigate]);

	async function handleSignOut() {
		const { error } = await authClient.signOut({
			callbackURL: "/login",
		});

		if (error) {
			window.location.href = "/login";
			return;
		}

		void navigate({ to: "/login" });
	}

	if (!session) {
		return (
			<div className="flex h-screen items-center justify-center">
				Carregando...
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b">
				<div className="container mx-auto flex items-center justify-between p-4">
					<span className="text-lg font-semibold">Registro Escolar</span>
					<Button type="button" variant="outline" onClick={handleSignOut}>
						Sair
					</Button>
				</div>
			</header>
			<main className="container mx-auto p-4">
				<Outlet />
			</main>
		</div>
	);
}
