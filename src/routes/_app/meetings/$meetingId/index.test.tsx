import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Meeting } from "#/lib/meetings/schema";

const mocks = vi.hoisted(() => ({
	useMeeting: vi.fn(),
	useMeetingClasses: vi.fn(),
	useParticipants: vi.fn(),
	useGeneralReports: vi.fn(),
	useMinuteTemplates: vi.fn(),
	useMinutePreview: vi.fn(),
	useMinuteVersions: vi.fn(),
	useGenerateMinute: vi.fn(),
	useAddParticipant: vi.fn(),
	useAsyncOptions: vi.fn(),
	useTransitionMeeting: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({ meetingId: "meeting-1" }),
	}),
	Link: ({
		children,
		to,
		...rest
	}: { children: React.ReactNode; to: string } & Record<string, unknown>) => (
		<a href={to} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("#/components/meetings/edit-meeting-dialog", () => ({
	EditMeetingDialog: () => null,
}));
vi.mock("#/hooks/entity-fetchers", () => ({
	fetchRolesPage: vi.fn(),
	fetchStaffPage: vi.fn(),
}));
vi.mock("#/hooks/general-reports/use-general-reports", () => ({
	useGeneralReports: mocks.useGeneralReports,
}));
vi.mock("#/hooks/meetings/use-add-participant", () => ({
	useAddParticipant: mocks.useAddParticipant,
}));
vi.mock("#/hooks/meetings/use-meeting", () => ({
	useMeeting: mocks.useMeeting,
}));
vi.mock("#/hooks/meetings/use-meeting-classes", () => ({
	useMeetingClasses: mocks.useMeetingClasses,
}));
vi.mock("#/hooks/meetings/use-participants", () => ({
	useParticipants: mocks.useParticipants,
}));
vi.mock("#/hooks/meetings/use-transition-meeting", () => ({
	useTransitionMeeting: mocks.useTransitionMeeting,
}));
vi.mock("#/hooks/minutes/use-generate-minute", () => ({
	useGenerateMinute: mocks.useGenerateMinute,
}));
vi.mock("#/hooks/minutes/use-minute-preview", () => ({
	useMinutePreview: mocks.useMinutePreview,
}));
vi.mock("#/hooks/minutes/use-minute-templates", () => ({
	useMinuteTemplates: mocks.useMinuteTemplates,
}));
vi.mock("#/hooks/minutes/use-minute-versions", () => ({
	useMinuteVersions: mocks.useMinuteVersions,
}));
vi.mock("#/hooks/use-async-options", () => ({
	useAsyncOptions: mocks.useAsyncOptions,
}));

import MeetingDetailPage from "./index";

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "meeting-1",
		title: "Conselho de Classe",
		status: "in_progress",
		heldAt: now,
		templateId: null,
		createdAt: now,
		updatedAt: now,
		...overrides,
	} as Meeting;
}

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<MeetingDetailPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.useMeeting.mockReturnValue({
		data: makeMeeting(),
		isLoading: false,
	});
	mocks.useMeetingClasses.mockReturnValue({ data: [], isLoading: false });
	mocks.useParticipants.mockReturnValue({ data: [], isLoading: false });
	mocks.useGeneralReports.mockReturnValue({ data: [] });
	mocks.useMinuteTemplates.mockReturnValue({ data: [] });
	mocks.useMinutePreview.mockReturnValue({
		data: undefined,
		isLoading: false,
		error: null,
	});
	mocks.useMinuteVersions.mockReturnValue({
		data: [],
		isLoading: false,
		error: null,
	});
	mocks.useGenerateMinute.mockReturnValue({
		mutate: vi.fn(),
		mutateAsync: vi.fn().mockResolvedValue(undefined),
		isPending: false,
		error: null,
		data: undefined,
	});
	mocks.useAddParticipant.mockReturnValue({
		mutateAsync: vi.fn().mockResolvedValue(undefined),
		isPending: false,
		error: null,
	});
	mocks.useAsyncOptions.mockReturnValue({ data: undefined, isLoading: false });
	mocks.useTransitionMeeting.mockReturnValue({
		mutateAsync: vi.fn().mockResolvedValue(undefined),
		isPending: false,
		error: null,
	});
});

describe("MeetingDetailPage (header em 375px)", () => {
	it("exibe os quatro abas do detail", () => {
		renderPage();
		expect(screen.getByText("Visão Geral")).toBeInTheDocument();
		expect(screen.getByText("Turmas (0)")).toBeInTheDocument();
		expect(screen.getByText("Participantes (0)")).toBeInTheDocument();
		expect(screen.getByText("Ata e Documentos")).toBeInTheDocument();
	});

	it("permite rolagem horizontal nas abas (overflow-x-auto)", () => {
		renderPage();
		const scrollWrapper = document.querySelector(
			".min-w-0.max-w-full.overflow-x-auto",
		);
		expect(scrollWrapper).not.toBeNull();
		expect(
			scrollWrapper?.querySelector("[data-slot='tabs-list']"),
		).not.toBeNull();
	});

	it("quebra as ações do header em telas estreitas (flex-wrap)", () => {
		renderPage();
		const actionsRow = document.querySelector(
			".border-b.pb-2 > .flex.flex-wrap.items-center.gap-2",
		);
		expect(actionsRow).not.toBeNull();
	});
});
