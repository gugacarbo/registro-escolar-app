import { useStaff } from "#/hooks/staff/use-staff";

export function useParticipantName() {
	const { data: staffPage, isLoading } = useStaff({ pageSize: 100 });
	const staffById = new Map(
		(staffPage?.data ?? []).map((member) => [member.id, member.name]),
	);
	return {
		staffById,
		isLoading,
		getParticipantName: (staffId: string) => staffById.get(staffId) ?? staffId,
	};
}
