import { createFileRoute, Outlet } from "@tanstack/react-router";

import { PageSection } from "#/components/ui/page";
import { Spinner } from "#/components/ui/spinner";
import { useAuthSession } from "#/lib/auth/session-context";

export const Route = createFileRoute("/_app/admin")({
	component: AdminLayout,
});

export default function AdminLayout() {
	const session = useAuthSession();

	let content: React.ReactNode;
	if (!session) {
		content = (
			<div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground">
				<Spinner className="size-4" aria-hidden="true" />
				Carregando...
			</div>
		);
	} else if (session.user.role !== "admin") {
		content = (
			<PageSection title="Acesso negado">
				<p className="text-sm text-muted-foreground">
					Esta área é restrita a administradores. Fale com a equipe responsável
					para solicitar o papel de admin.
				</p>
			</PageSection>
		);
	} else {
		content = <Outlet />;
	}

	return <>{content}</>;
}
