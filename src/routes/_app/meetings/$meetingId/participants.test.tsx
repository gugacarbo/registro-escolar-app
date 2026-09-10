import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useParticipants: vi.fn(),
	useAddParticipant: vi.fn(),
	useStaff: vi.fn(),
	useRoles: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({ meetingId: "meeting-1" }),
	}),
}));
vi.mock("#/hooks/meetings/use-participants", () => ({
	useParticipants: mocks.useParticipants,
}));
vi.mock("#/hooks/meetings/use-add-participant", () => ({
	useAddParticipant: mocks.useAddParticipant,
}));
vi.mock("#/hooks/staff/use-staff", () => ({ useStaff: mocks.useStaff }));
vi.mock("#/hooks/roles/use-roles", () => ({ useRoles: mocks.useRoles }));

import { ParticipantsPage } from "./participants";

function renderPage() {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<ParticipantsPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.useParticipants.mockReturnValue({
		data: [{ id: "p-1", staffId: "staff-1", roleId: "role-1" }],
		isLoading: false,
	});
	mocks.useStaff.mockReturnValue({
		data: { data: [{ id: "staff-1", name: "Maria Silva" }] },
	});
	mocks.useRoles.mockReturnValue({
		data: { data: [{ id: "role-1", name: "Coordenador" }] },
	});
	mocks.useAddParticipant.mockReturnValue({
		mutateAsync: vi.fn(),
		isPending: false,
	});
});

describe("ParticipantsPage", () => {
	it("exibe nomes legíveis de servidor e papel", () => {
		renderPage();
		expect(screen.getByText(/Maria Silva — Coordenador/)).toBeInTheDocument();
	});
});
