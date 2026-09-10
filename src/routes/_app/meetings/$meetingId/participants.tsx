import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { EntitySelect } from "#/components/ui/entity-select";
import { PageShell } from "#/components/ui/page";
import { fetchRolesPage, fetchStaffPage } from "#/hooks/entity-fetchers";
import { useAddParticipant } from "#/hooks/meetings/use-add-participant";
import { useParticipants } from "#/hooks/meetings/use-participants";
import { useAsyncOptions } from "#/hooks/use-async-options";

export const Route = createFileRoute("/_app/meetings/$meetingId/participants")({
	component: ParticipantsPage,
});

export default function ParticipantsPage() {
	const { meetingId } = Route.useParams();
	const { data: participants, isLoading } = useParticipants(meetingId);
	const [staffSearch, setStaffSearch] = useState("");
	const [roleSearch, setRoleSearch] = useState("");
	const { data: staffResult, isLoading: isLoadingStaff } = useAsyncOptions({
		queryKey: ["meeting-participants", "staff"],
		search: staffSearch,
		fetchPage: fetchStaffPage,
		select: (member) => ({ id: member.id, name: member.name }),
	});
	const staff = staffResult?.options ?? [];
	const staffById = new Map(staff.map((member) => [member.id, member.name]));
	const { data: rolesResult, isLoading: isLoadingRoles } = useAsyncOptions({
		queryKey: ["meeting-participants", "roles"],
		search: roleSearch,
		fetchPage: fetchRolesPage,
		select: (role) => ({ id: role.id, name: role.name }),
	});
	const roles = rolesResult?.options ?? [];
	const roleById = new Map(roles.map((role) => [role.id, role.name]));
	const addParticipant = useAddParticipant(meetingId);
	const [staffId, setStaffId] = useState("");
	const [roleId, setRoleId] = useState("");
	const [serverError, setServerError] = useState<string | null>(null);

	async function handleAdd() {
		setServerError(null);
		if (!staffId || !roleId) {
			setServerError("Selecione o servidor e o papel");
			return;
		}
		try {
			await addParticipant.mutateAsync({ staffId, roleId });
			setStaffId("");
			setRoleId("");
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<PageShell>
			<h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem]">
				Participantes
			</h1>
			<div className="flex flex-wrap items-end gap-2">
				<EntitySelect
					label="Servidor"
					placeholder="Servidor"
					value={staffId}
					onChange={setStaffId}
					options={staff}
					isLoading={isLoadingStaff}
					total={staffResult?.total ?? 0}
					loadedAll={staffResult?.loadedAll ?? true}
					search={staffSearch}
					onSearchChange={setStaffSearch}
				/>
				<EntitySelect
					label="Papel"
					placeholder="Papel"
					value={roleId}
					onChange={setRoleId}
					options={roles}
					isLoading={isLoadingRoles}
					total={rolesResult?.total ?? 0}
					loadedAll={rolesResult?.loadedAll ?? true}
					search={roleSearch}
					onSearchChange={setRoleSearch}
				/>
				<Button
					onClick={() => void handleAdd()}
					disabled={addParticipant.isPending}
				>
					Adicionar
				</Button>
			</div>
			{serverError && <p className="text-sm text-destructive">{serverError}</p>}
			{isLoading && <p>Carregando...</p>}
			{participants && (
				<ul className="space-y-2">
					{participants.map((participant) => (
						<li key={participant.id} className="rounded border p-2">
							{staffById.get(participant.staffId) ?? participant.staffId} —{" "}
							{roleById.get(participant.roleId) ?? participant.roleId}
						</li>
					))}
				</ul>
			)}
		</PageShell>
	);
}
