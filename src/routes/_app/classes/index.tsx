import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { CreateClassDialog } from "#/components/classes/create-class-dialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useClasses } from "#/hooks/classes/use-classes";

export const Route = createFileRoute("/_app/classes/")({
	component: ClassesPage,
});

function ClassesPage() {
	const [search, setSearch] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const { data: classes, isLoading } = useClasses(search);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Turmas</h1>
				<div className="flex gap-2">
					<Button onClick={() => setDialogOpen(true)}>Nova turma</Button>
					<Link to="/classes/enroll">
						<Button variant="secondary">Matricular aluno</Button>
					</Link>
				</div>
			</div>
			<Input
				placeholder="Buscar por nome"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
			/>
			{isLoading && <p>Carregando...</p>}
			{classes && classes.length === 0 && <p>Nenhuma turma encontrada.</p>}
			{classes && classes.length > 0 && (
				<ul className="space-y-2">
					{classes.map((classRow) => (
						<li key={classRow.id} className="rounded border p-2">
							<div className="flex items-center justify-between">
								<span>
									{classRow.name} — {classRow.academicPeriod}
								</span>
								<Link
									to="/classes/$id/students"
									params={{ id: classRow.id }}
									search={{ date: undefined }}
									className="text-sm underline"
								>
									Ver alunos
								</Link>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
