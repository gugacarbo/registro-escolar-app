import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { RoleForm, type RoleFormValues } from "#/components/roles/role-form";
import { useCreateRole } from "#/hooks/roles/use-create-role";

export const Route = createFileRoute("/_app/roles/new")({
	component: NewRolePage,
});

function NewRolePage() {
	const navigate = useNavigate();
	const createRole = useCreateRole();
	const [serverError, setServerError] = useState<string | null>(null);

	async function handleSubmit(values: RoleFormValues) {
		setServerError(null);
		try {
			await createRole.mutateAsync(values);
			void navigate({ to: "/roles" });
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<div className="mx-auto max-w-md space-y-4">
			<h1 className="text-2xl font-bold">Novo papel</h1>
			<RoleForm onSubmit={handleSubmit} serverError={serverError} />
		</div>
	);
}
