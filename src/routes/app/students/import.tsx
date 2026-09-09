import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/students/import")({
	component: ImportStudentsPage,
});

function ImportStudentsPage() {
	return <div>Importação de alunos</div>;
}
