import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

export const Route = createFileRoute("/register")({
	component: RegisterPage,
});

export function RegisterPage() {
	const navigate = useNavigate();
	const [isCheckingSession, setIsCheckingSession] = useState(true);
	const [serverError, setServerError] = useState<string | null>(null);
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
				if (data) void navigate({ to: "/app" });
			})
			.finally(() => {
				if (active) setIsCheckingSession(false);
			});

		return () => {
			active = false;
		};
	}, [navigate]);

	async function handleSubmit(values: RegisterValues) {
		setServerError(null);
		const { error } = await authClient.signUp.email({
			name: values.name,
			email: values.email,
			password: values.password,
			callbackURL: "/app",
		});

		if (error) {
			setServerError("Não foi possível criar a conta.");
			return;
		}

		void navigate({ to: "/app" });
	}

	if (isCheckingSession) {
		return <LoadingScreen />;
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Criar conta</CardTitle>
					<CardDescription>
						Cadastre-se para usar o Registro Escolar.
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
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input {...field} type="email" autoComplete="email" />
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
											<Input
												{...field}
												type="password"
												autoComplete="new-password"
											/>
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
		<div className="flex h-screen items-center justify-center">
			Carregando...
		</div>
	);
}
