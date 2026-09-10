import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MeetingStatusBadge } from "./meeting-status-badge";

describe("MeetingStatusBadge", () => {
	it("renderiza todos os status conhecidos", () => {
		const cases = [
			["draft", "Rascunho"],
			["in_progress", "Em andamento"],
			["finished", "Finalizada"],
			["reopened", "Reaberta"],
		] as const;
		for (const [status, label] of cases) {
			const { unmount } = render(<MeetingStatusBadge status={status} />);
			expect(screen.getByText(label)).toBeInTheDocument();
			unmount();
		}
	});

	it("usa fallback para status desconhecido", () => {
		render(<MeetingStatusBadge status="custom" />);
		expect(screen.getByText("custom")).toBeInTheDocument();
	});
});
