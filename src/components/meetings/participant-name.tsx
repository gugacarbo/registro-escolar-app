import { useMemo } from "react";

import { fetchStaffPage } from "#/hooks/entity-fetchers";
import { useAsyncOptions } from "#/hooks/use-async-options";

export function useParticipantName(search = "") {
	const { data, isLoading } = useAsyncOptions({
		queryKey: ["participant-names"],
		search,
		fetchPage: fetchStaffPage,
		select: (member) => ({ id: member.id, name: member.name }),
	});
	const staffById = useMemo(
		() =>
			new Map((data?.options ?? []).map((member) => [member.id, member.name])),
		[data],
	);
	return {
		staffById,
		isLoading,
		total: data?.total ?? 0,
		loadedAll: data?.loadedAll ?? true,
		getParticipantName: (staffId: string) => staffById.get(staffId) ?? staffId,
	};
}
