import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	getSession: vi.fn(),
	signInEmail: vi.fn(),
	signUpEmail: vi.fn(),
	signOut: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="#">{children}</a>
	),
	useNavigate: () => mocks.navigate,
}));

vi.mock("#/lib/auth-client", () => ({
	authClient: {
		getSession: mocks.getSession,
		signIn: { email: mocks.signInEmail },
		signUp: { email: mocks.signUpEmail },
		signOut: mocks.signOut,
	},
}));

import { LoginPage } from "./login";
import { RegisterPage } from "./register";

const session = {
	session: { id: "session-1" },
	user: { id: "user-1", name: "Operador", email: "operador@escola.test" },
};

beforeEach(() => {
	mocks.navigate.mockReset();
	mocks.getSession.mockReset();
	mocks.signInEmail.mockReset();
	mocks.signUpEmail.mockReset();
	mocks.getSession.mockResolvedValue({ data: null });
	mocks.signInEmail.mockResolvedValue({ data: {}, error: null });
	mocks.signUpEmail.mockResolvedValue({ data: {}, error: null });
});

describe("LoginPage", () => {
	it("direciona usuários autenticados para a área privada", async () => {
		mocks.getSession.mockResolvedValue({ data: session });

		render(<LoginPage />);

		await waitFor(() =>
			expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" }),
		);
	});

	it("exibe erro sem redirecionar quando as credenciais são inválidas", async () => {
		mocks.signInEmail.mockResolvedValue({
			data: null,
			error: { code: "INVALID_EMAIL_OR_PASSWORD" },
		});

		render(<LoginPage />);
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Entrar" }),
			).toBeInTheDocument(),
		);
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "operador@escola.test" },
		});
		fireEvent.change(screen.getByLabelText("Senha"), {
			target: { value: "senha-incorreta" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Email ou senha inválidos.",
		);
		expect(mocks.navigate).not.toHaveBeenCalledWith({ to: "/" });
	});

	it("autentica com email e senha e direciona para a área privada", async () => {
		render(<LoginPage />);

		await waitFor(() => expect(mocks.getSession).toHaveBeenCalled());
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "operador@escola.test" },
		});
		fireEvent.change(screen.getByLabelText("Senha"), {
			target: { value: "senha-segura" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

		await waitFor(() =>
			expect(mocks.signInEmail).toHaveBeenCalledWith({
				email: "operador@escola.test",
				password: "senha-segura",
				callbackURL: "/",
			}),
		);
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" });
	});

	it("não navega após desmontar durante a checagem de sessão", async () => {
		let resolveSession: (value: { data: typeof session }) => void = () => {};
		mocks.getSession.mockReturnValue(
			new Promise<{ data: typeof session }>((resolve) => {
				resolveSession = resolve;
			}),
		);

		const { unmount } = render(<LoginPage />);
		unmount();
		resolveSession({ data: session });

		expect(mocks.navigate).not.toHaveBeenCalled();
	});
});

describe("RegisterPage", () => {
	it("direciona usuários autenticados para a área privada", async () => {
		mocks.getSession.mockResolvedValue({ data: session });

		render(<RegisterPage />);

		await waitFor(() =>
			expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" }),
		);
	});

	it("exibe erro sem redirecionar quando o cadastro falha", async () => {
		mocks.signUpEmail.mockResolvedValue({
			data: null,
			error: { code: "USER_ALREADY_EXISTS" },
		});

		render(<RegisterPage />);
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Cadastrar" }),
			).toBeInTheDocument(),
		);
		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Operador" },
		});
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "operador@escola.test" },
		});
		fireEvent.change(screen.getByLabelText("Senha"), {
			target: { value: "senha-segura" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível criar a conta.",
		);
		expect(mocks.navigate).not.toHaveBeenCalledWith({ to: "/" });
	});

	it("cria a conta e direciona para a área privada", async () => {
		render(<RegisterPage />);

		await waitFor(() => expect(mocks.getSession).toHaveBeenCalled());
		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Operador" },
		});
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "operador@escola.test" },
		});
		fireEvent.change(screen.getByLabelText("Senha"), {
			target: { value: "senha-segura" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

		await waitFor(() =>
			expect(mocks.signUpEmail).toHaveBeenCalledWith({
				name: "Operador",
				email: "operador@escola.test",
				password: "senha-segura",
				callbackURL: "/",
			}),
		);
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" });
	});

	it("não navega após desmontar durante a checagem de sessão", async () => {
		let resolveSession: (value: { data: typeof session }) => void = () => {};
		mocks.getSession.mockReturnValue(
			new Promise<{ data: typeof session }>((resolve) => {
				resolveSession = resolve;
			}),
		);

		const { unmount } = render(<RegisterPage />);
		unmount();
		resolveSession({ data: session });

		expect(mocks.navigate).not.toHaveBeenCalled();
	});
});
