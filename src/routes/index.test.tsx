import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	getSession: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
	useNavigate: () => mocks.navigate,
}));

vi.mock("#/lib/auth-client", () => ({
	authClient: { getSession: mocks.getSession },
}));

import { HomePage } from "./index";

beforeEach(() => {
	mocks.navigate.mockReset();
	mocks.getSession.mockReset();
});

describe("HomePage", () => {
	it("direciona usuários autenticados para a área privada", async () => {
		mocks.getSession.mockResolvedValue({
			data: { session: { id: "session-1" }, user: { id: "user-1" } },
		});

		render(<HomePage />);

		await waitFor(() =>
			expect(mocks.navigate).toHaveBeenCalledWith({ to: "/app" }),
		);
	});

	it("direciona visitantes para o login", async () => {
		mocks.getSession.mockResolvedValue({ data: null });

		render(<HomePage />);

		await waitFor(() =>
			expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login" }),
		);
	});

	it("direciona visitantes para o login quando a sessão falha", async () => {
		mocks.getSession.mockRejectedValue(new Error("network"));

		render(<HomePage />);

		await waitFor(() =>
			expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login" }),
		);
	});

	it("não navega após desmontar durante a checagem de sessão", async () => {
		let resolveSession: (value: { data: null }) => void = () => {};
		mocks.getSession.mockReturnValue(
			new Promise<{ data: null }>((resolve) => {
				resolveSession = resolve;
			}),
		);

		const { unmount } = render(<HomePage />);
		unmount();
		resolveSession({ data: null });

		expect(mocks.navigate).not.toHaveBeenCalled();
	});
});
