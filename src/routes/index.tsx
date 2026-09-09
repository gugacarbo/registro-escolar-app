import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/")({
	component: HomePage,
});

export function HomePage() {
	const navigate = useNavigate();

	useEffect(() => {
		let active = true;

		authClient
			.getSession()
			.then(({ data }) => {
				if (!active) return;
				void navigate({ to: data ? "/app" : "/login" });
			})
			.catch(() => {
				if (active) void navigate({ to: "/login" });
			});

		return () => {
			active = false;
		};
	}, [navigate]);

	return (
		<div className="flex h-screen items-center justify-center">
			Carregando...
		</div>
	);
}
