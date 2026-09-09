import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppHeader } from "#/components/app-header";
import { AppSidebar } from "#/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";
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
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<AppHeader
					userName={session.user.name}
					userEmail={session.user.email}
					onSignOut={handleSignOut}
				/>
				<main className="container mx-auto w-full max-w-5xl flex-1 p-4">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
