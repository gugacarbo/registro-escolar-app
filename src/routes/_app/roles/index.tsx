import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { CreateRoleDialog } from "#/components/roles/create-role-dialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useRoles } from "#/hooks/roles/use-roles";

export const Route = createFileRoute("/_app/roles/")({
	component: RolesPage,
});

function RolesPage() {
	const [search, setSearch] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const { data: roles, isLoading } = useRoles(search);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Papéis</h1>
				<Button onClick={() => setDialogOpen(true)}>Novo papel</Button>
			</div>
			<Input
				placeholder="Buscar por nome"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
			/>
			{isLoading && <p>Carregando...</p>}
			{roles && (
				<ul className="space-y-2">
					{roles.map((role) => (
						<li key={role.id} className="rounded border p-2">
							{role.name}
						</li>
					))}
				</ul>
			)}
			<CreateRoleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</div>
	);
}
