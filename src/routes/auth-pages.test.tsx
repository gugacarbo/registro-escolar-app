import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import LoginPage from "./login";
import RegisterPage from "./register";

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

	global.fetch = vi.fn().mockImplementation((url: string) => {
		if (url.includes("/api/invitations/status")) {
			return Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						open: true,
						isInitialSetup: true,
						requiresInvite: false,
					}),
			});
		}
		return Promise.resolve({
			ok: true,
			json: () => Promise.resolve({}),
		});
	});
});

afterEach(() => {
	window.history.pushState({}, "", "/");
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

	it("permite mostrar e ocultar a senha", async () => {
		render(<LoginPage />);

		const password = await screen.findByLabelText("Senha");
		expect(password).toHaveAttribute("type", "password");

		fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
		expect(password).toHaveAttribute("type", "text");

		fireEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
		expect(password).toHaveAttribute("type", "password");
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
	it("permite mostrar e ocultar a senha", async () => {
		render(<RegisterPage />);

		const password = await screen.findByLabelText("Senha");
		expect(password).toHaveAttribute("type", "password");

		fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
		expect(password).toHaveAttribute("type", "text");

		fireEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
		expect(password).toHaveAttribute("type", "password");
	});

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
				fetchOptions: undefined,
			}),
		);
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" });
	});

	it("bloqueia cadastro público quando a instância já possui admin e nenhum convite é informado", async () => {
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/api/invitations/status")) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							open: false,
							isInitialSetup: false,
							requiresInvite: true,
						}),
				});
			}
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({}),
			});
		});

		render(<RegisterPage />);

		await waitFor(() =>
			expect(screen.getByText("Cadastro por Convite")).toBeInTheDocument(),
		);
		expect(
			screen.getByText(/O cadastro público está restrito/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Ir para o login" }),
		).toBeInTheDocument();
	});

	it("preenche e bloqueia o e-mail quando recebe token de convite válido", async () => {
		window.history.pushState({}, "", "/register?token=tok-convite-valido");

		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/api/invitations/status")) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							open: false,
							isInitialSetup: false,
							requiresInvite: true,
						}),
				});
			}
			if (url.includes("/api/invitations/verify")) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							valid: true,
							email: "convidado.especial@escola.test",
						}),
				});
			}
			return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
		});

		render(<RegisterPage />);

		await waitFor(() =>
			expect(
				screen.getByDisplayValue("convidado.especial@escola.test"),
			).toBeInTheDocument(),
		);

		const emailInput = screen.getByLabelText("Email");
		expect(emailInput).toHaveAttribute("readonly");

		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Convidado Especial" },
		});
		fireEvent.change(screen.getByLabelText("Senha"), {
			target: { value: "senha-segura" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

		await waitFor(() =>
			expect(mocks.signUpEmail).toHaveBeenCalledWith({
				name: "Convidado Especial",
				email: "convidado.especial@escola.test",
				password: "senha-segura",
				callbackURL: "/",
				fetchOptions: {
					headers: {
						"x-invite-token": "tok-convite-valido",
					},
				},
			}),
		);

		// Limpar url
		window.history.pushState({}, "", "/register");
	});

	it("exibe tela de erro se o token de convite for inválido ou expirado", async () => {
		window.history.pushState({}, "", "/register?token=tok-expirado");

		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/api/invitations/status")) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							open: false,
							isInitialSetup: false,
							requiresInvite: true,
						}),
				});
			}
			if (url.includes("/api/invitations/verify")) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							valid: false,
							error: "Este convite expirou (validade de 7 dias).",
						}),
				});
			}
			return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
		});

		render(<RegisterPage />);

		await waitFor(() =>
			expect(screen.getByText("Convite Inválido")).toBeInTheDocument(),
		);
		expect(
			screen.getByText("Este convite expirou (validade de 7 dias)."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Voltar para o login" }),
		).toBeInTheDocument();

		// Limpar url
		window.history.pushState({}, "", "/register");
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
