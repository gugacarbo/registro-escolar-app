import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { StaffForm, type StaffFormValues } from "#/components/staff/staff-form";
import { PageShell } from "#/components/ui/page";
import { useCreateStaff } from "#/hooks/staff/use-create-staff";

export const Route = createFileRoute("/_app/staff/new")({
	component: NewStaffPage,
});

function NewStaffPage() {
	const navigate = useNavigate();
	const createStaff = useCreateStaff();
	const [serverError, setServerError] = useState<string | null>(null);

	async function handleSubmit(values: StaffFormValues) {
		setServerError(null);
		try {
			await createStaff.mutateAsync(values);
			void navigate({ to: "/staff" });
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<PageShell className="mx-auto max-w-2xl">
			<h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem]">
				Novo servidor
			</h1>
			<StaffForm onSubmit={handleSubmit} serverError={serverError} />
		</PageShell>
	);
}
