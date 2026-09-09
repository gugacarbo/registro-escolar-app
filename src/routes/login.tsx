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

const loginSchema = z.object({
	email: z.string().email("Email inválido"),
	password: z.string().min(1, "Senha obrigatória"),
});

type LoginValues = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

export function LoginPage() {
	const navigate = useNavigate();
	const [isCheckingSession, setIsCheckingSession] = useState(true);
	const [serverError, setServerError] = useState<string | null>(null);
	const form = useForm<LoginValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: "", password: "" },
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

	async function handleSubmit(values: LoginValues) {
		setServerError(null);
		const { error } = await authClient.signIn.email({
			email: values.email,
			password: values.password,
			callbackURL: "/",
		});

		if (error) {
			setServerError("Email ou senha inválidos.");
			return;
		}

		void navigate({ to: "/" });
	}

	if (isCheckingSession) {
		return <LoadingScreen />;
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Entrar</CardTitle>
					<CardDescription>
						Acesse o Registro Escolar com sua conta.
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
												autoComplete="current-password"
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
							<FormSubmit className="w-full">Entrar</FormSubmit>
						</FormNative>
					</Form>
					<p className="mt-4 text-center text-sm">
						Não tem conta?{" "}
						<Button variant="link" asChild className="h-auto p-0">
							<Link to="/register">Cadastre-se</Link>
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
