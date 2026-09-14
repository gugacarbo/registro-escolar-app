import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, GraduationCap, Lock, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PasswordInput } from "#/components/password-input";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormNative,
	FormSubmit,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";

const registerSchema = z.object({
	name: z.string().trim().min(1, "Nome obrigatório"),
	email: z.string().email("Email inválido"),
	password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type RegisterValues = z.infer<typeof registerSchema>;

interface RegistrationStatus {
	open: boolean;
	isInitialSetup: boolean;
	requiresInvite: boolean;
}

export const Route = createFileRoute("/register")({
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === "string" ? search.token : undefined,
	}),
	component: RegisterPage,
});

export default function RegisterPage() {
	const navigate = useNavigate();
	const [isCheckingSession, setIsCheckingSession] = useState(true);
	const [serverError, setServerError] = useState<string | null>(null);
	const [status, setStatus] = useState<RegistrationStatus | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [isVerifyingToken, setIsVerifyingToken] = useState(false);
	const [inviteError, setInviteError] = useState<string | null>(null);
	const [isEmailLocked, setIsEmailLocked] = useState(false);

	const form = useForm<RegisterValues>({
		resolver: zodResolver(registerSchema),
		defaultValues: { name: "", email: "", password: "" },
	});

	useEffect(() => {
		let active = true;

		authClient
			.getSession()
			.then(({ data }) => {
				if (!active) return;
				if (data) void navigate({ to: "/" });
			})
			.finally(() => {
				if (active) setIsCheckingSession(false);
			});

		return () => {
			active = false;
		};
	}, [navigate]);

	useEffect(() => {
		const searchParams =
			typeof window !== "undefined"
				? new URLSearchParams(window.location.search)
				: null;
		const queryToken = searchParams?.get("token");
		if (queryToken) {
			setToken(queryToken);
		}

		let active = true;

		fetch("/api/invitations/status")
			.then((res) => (res.ok ? res.json() : null))
			.then((data: unknown) => {
				if (!active) return;
				if (data) {
					setStatus(data as RegistrationStatus);
				}
			})
			.catch(() => {
				// Fallback gracioso caso endpoint não esteja disponível
			});

		if (queryToken) {
			setIsVerifyingToken(true);
			fetch(`/api/invitations/verify?token=${encodeURIComponent(queryToken)}`)
				.then((res) => res.json())
				.then((data: unknown) => {
					const parsed = data as {
						valid: boolean;
						email?: string;
						error?: string;
					};
					if (!active) return;
					if (parsed.valid && parsed.email) {
						form.setValue("email", parsed.email);
						setIsEmailLocked(true);
					} else {
						setInviteError(parsed.error || "Convite inválido ou expirado.");
					}
				})
				.catch(() => {
					if (active) setInviteError("Erro ao verificar convite.");
				})
				.finally(() => {
					if (active) setIsVerifyingToken(false);
				});
		}

		return () => {
			active = false;
		};
	}, [form]);

	async function handleSubmit(values: RegisterValues) {
		setServerError(null);
		const { error } = await authClient.signUp.email({
			name: values.name,
			email: values.email,
			password: values.password,
			callbackURL: "/",
			fetchOptions: token
				? {
						headers: {
							"x-invite-token": token,
						},
					}
				: undefined,
		});

		if (error) {
			setServerError(error.message || "Não foi possível criar a conta.");
			return;
		}

		void navigate({ to: "/" });
	}

	if (isCheckingSession || isVerifyingToken) {
		return <LoadingScreen />;
	}

	// Se o sistema exige convite e o usuário não forneceu token
	if (status?.requiresInvite && !token) {
		return (
			<div className="auth-stage flex min-h-screen items-center justify-center p-4">
				<Card className="w-full max-w-sm text-center">
					<CardHeader>
						<span
							className="mx-auto mb-3 flex size-12 items-center justify-center rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm"
							aria-hidden="true"
						>
							<ShieldAlert className="size-6" />
						</span>
						<CardTitle className="font-display text-2xl tracking-tight">
							Cadastro por Convite
						</CardTitle>
						<CardDescription className="text-sm">
							O cadastro público está restrito. Para ingressar na plataforma,
							solicite um convite a um usuário já cadastrado.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert variant="default" className="text-left text-sm">
							<AlertDescription>
								Os convites são enviados diretamente por e-mail e possuem
								validade de 7 dias a partir do envio.
							</AlertDescription>
						</Alert>
						<Button asChild className="w-full">
							<Link to="/login">Ir para o login</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Se um token foi fornecido mas é inválido/expirado
	if (token && inviteError) {
		return (
			<div className="auth-stage flex min-h-screen items-center justify-center p-4">
				<Card className="w-full max-w-sm text-center">
					<CardHeader>
						<span
							className="mx-auto mb-3 flex size-12 items-center justify-center rounded-md border border-destructive/20 bg-destructive/10 text-destructive shadow-sm"
							aria-hidden="true"
						>
							<ShieldAlert className="size-6" />
						</span>
						<CardTitle className="font-display text-2xl tracking-tight">
							Convite Inválido
						</CardTitle>
						<CardDescription className="text-sm">{inviteError}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert variant="destructive" className="text-left text-sm">
							<AlertDescription>
								Convites expiram após 7 dias da emissão ou após serem
								utilizados. Entre em contato com quem enviou para solicitar um
								novo convite.
							</AlertDescription>
						</Alert>
						<Button asChild variant="outline" className="w-full">
							<Link to="/login">Voltar para o login</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="auth-stage flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<span
						className="mb-3 flex size-11 items-center justify-center rounded-md border border-primary/15 bg-primary text-primary-foreground shadow-[4px_4px_0_0_color-mix(in_oklab,var(--highlight)_75%,transparent)]"
						aria-hidden="true"
					>
						<GraduationCap className="size-5" />
					</span>
					<CardTitle className="font-display text-2xl tracking-tight">
						Criar conta
					</CardTitle>
					<CardDescription>
						{status?.isInitialSetup ? (
							<span className="text-amber-600 dark:text-amber-400 font-medium">
								Primeiro acesso: conta do administrador permanente.
							</span>
						) : token ? (
							<span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
								<CheckCircle2 className="size-4 shrink-0" />
								Cadastro por convite validado.
							</span>
						) : (
							"Cadastre-se para usar o Registro Escolar."
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<FormNative
							onSubmit={() => form.handleSubmit(handleSubmit)()}
							className="space-y-4"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Nome</FormLabel>
										<FormControl>
											<Input {...field} autoComplete="name" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<div className="flex items-center justify-between">
											<FormLabel>Email</FormLabel>
											{isEmailLocked && (
												<span className="flex items-center gap-1 text-xs text-muted-foreground">
													<Lock className="size-3" /> Convite
												</span>
											)}
										</div>
										<FormControl>
											<Input
												{...field}
												type="email"
												autoComplete="email"
												readOnly={isEmailLocked}
												className={
													isEmailLocked
														? "bg-muted cursor-not-allowed opacity-90"
														: ""
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Senha</FormLabel>
										<FormControl>
											<PasswordInput {...field} autoComplete="new-password" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{serverError && (
								<Alert variant="destructive">
									<AlertDescription>{serverError}</AlertDescription>
								</Alert>
							)}
							<FormSubmit className="w-full">Cadastrar</FormSubmit>
						</FormNative>
					</Form>
					<p className="mt-4 text-center text-sm">
						Já tem conta?{" "}
						<Button variant="link" asChild className="h-auto p-0">
							<Link to="/login">Faça login</Link>
						</Button>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

function LoadingScreen() {
	return (
		<div className="auth-stage flex h-screen items-center justify-center text-sm text-muted-foreground">
			Carregando...
		</div>
	);
}
