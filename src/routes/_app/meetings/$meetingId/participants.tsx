import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { EntitySelect } from "#/components/ui/entity-select";
import { Input } from "#/components/ui/input";
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
		select: (member) => ({
			id: member.id,
			name: member.name,
			defaultRoleId: member.defaultRoleId,
		}),
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
	const [roleIds, setRoleIds] = useState<string[]>([]);
	const [serverError, setServerError] = useState<string | null>(null);

	async function handleAdd() {
		setServerError(null);
		if (!staffId || roleIds.length === 0) {
			setServerError("Selecione o servidor e o papel");
			return;
		}
		try {
			await addParticipant.mutateAsync({ staffId, roleIds });
			setStaffId("");
			setRoleIds([]);
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<PageShell>
			<Link
				to="/meetings/$meetingId"
				params={{ meetingId }}
				className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground mb-1"
			>
				<ArrowLeftIcon className="size-3.5" />
				Voltar para detalhes da reunião
			</Link>
			<h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem]">
				Participantes
			</h1>
			<div className="flex flex-wrap items-end gap-2">
				<EntitySelect
					label="Servidor"
					placeholder="Servidor"
					value={staffId}
					onChange={(value) => {
						setStaffId(value);
						const selectedStaff = staff.find((member) => member.id === value);
						setRoleIds(
							selectedStaff?.defaultRoleId ? [selectedStaff.defaultRoleId] : [],
						);
					}}
					options={staff}
					isLoading={isLoadingStaff}
					total={staffResult?.total ?? 0}
					loadedAll={staffResult?.loadedAll ?? true}
					search={staffSearch}
					onSearchChange={setStaffSearch}
				/>
				<fieldset className="grid min-w-48 gap-2">
					<legend className="text-sm font-medium">Papéis</legend>
					<Input
						value={roleSearch}
						onChange={(event) => setRoleSearch(event.target.value)}
						placeholder="Buscar papel"
						aria-label="Buscar papel"
					/>
					<div className="grid gap-2 rounded-md border p-2">
						{roles.map((role) => (
							<label key={role.id} className="flex items-center gap-2 text-sm">
								<Checkbox
									checked={roleIds.includes(role.id)}
									onCheckedChange={(checked) =>
										setRoleIds((current) =>
											checked
												? [...current, role.id]
												: current.filter((id) => id !== role.id),
										)
									}
								/>
								{role.name}
							</label>
						))}
						{isLoadingRoles && (
							<p className="text-xs text-muted-foreground">
								Carregando papéis...
							</p>
						)}
					</div>
					<p className="text-xs text-muted-foreground">
						{roleIds.length === 0
							? "Selecione um ou mais papéis."
							: `${roleIds.length} papel(is) selecionado(s)`}
					</p>
				</fieldset>
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
