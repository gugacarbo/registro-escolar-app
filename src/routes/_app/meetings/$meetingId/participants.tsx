import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { useAddParticipant } from "#/hooks/meetings/use-add-participant";
import { useParticipants } from "#/hooks/meetings/use-participants";
import { useRoles } from "#/hooks/roles/use-roles";
import { useStaff } from "#/hooks/staff/use-staff";

export const Route = createFileRoute("/_app/meetings/$meetingId/participants")({
	component: ParticipantsPage,
});

function ParticipantsPage() {
	const { meetingId } = Route.useParams();
	const { data: participants, isLoading } = useParticipants(meetingId);
	const { data: staffPage } = useStaff({ pageSize: 100 });
	const staff = staffPage?.data ?? [];
	const { data: rolesPage } = useRoles({ pageSize: 100 });
	const roles = rolesPage?.data ?? [];
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
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Participantes</h1>
			<div className="flex flex-wrap items-end gap-2">
				<Select value={staffId} onValueChange={setStaffId}>
					<SelectTrigger aria-label="Servidor">
						<SelectValue placeholder="Servidor" />
					</SelectTrigger>
					<SelectContent>
						{staff.map((member) => (
							<SelectItem key={member.id} value={member.id}>
								{member.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={roleId} onValueChange={setRoleId}>
					<SelectTrigger aria-label="Papel">
						<SelectValue placeholder="Papel" />
					</SelectTrigger>
					<SelectContent>
						{roles.map((role) => (
							<SelectItem key={role.id} value={role.id}>
								{role.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
							{participant.staffId} — {participant.roleId}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
