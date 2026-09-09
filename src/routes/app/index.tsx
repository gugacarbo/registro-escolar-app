import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
	component: AppHome,
});

function AppHome() {
	return (
		<div className="space-y-4">
			<h1 className="text-3xl font-bold">Registro Escolar</h1>
			<div className="flex gap-4">
				<Link
					to="/app/students"
					className="rounded bg-primary px-4 py-2 text-primary-foreground"
				>
					Alunos
				</Link>
			</div>
		</div>
	);
}
