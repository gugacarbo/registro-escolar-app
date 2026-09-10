import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppHeader } from "#/components/app-header";
import { AppSidebar } from "#/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";
import { Spinner } from "#/components/ui/spinner";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});

type SessionData = Awaited<ReturnType<typeof authClient.getSession>>["data"];

export default function AppLayout() {
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
			<div className="flex min-h-svh items-center justify-center gap-3 bg-background/80 text-sm text-muted-foreground backdrop-blur-sm">
				<Spinner className="size-4" aria-hidden="true" />
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
				<main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-10 sm:p-6 sm:pb-14 lg:p-8">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
