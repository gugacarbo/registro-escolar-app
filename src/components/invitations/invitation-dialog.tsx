import { Mail, Send, X } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import {
	type InvitationItem,
	useCreateInvitation,
	useInvitations,
	useRevokeInvitation,
} from "#/hooks/invitations/use-invitations";

function invitationStatusLabel(status: InvitationItem["status"]) {
	const labels = {
		pending: "Pendente",
		accepted: "Aceito",
		expired: "Expirado",
		revoked: "Cancelado",
	};
	return labels[status];
}

function invitationStatusClass(status: InvitationItem["status"]) {
	const classes = {
		pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
		accepted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
		expired: "bg-muted text-muted-foreground",
		revoked: "bg-destructive/10 text-destructive",
	};
	return classes[status];
}

export function InvitationDialog() {
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const [serverError, setServerError] = useState<string | null>(null);
	const invitationsQuery = useInvitations();
	const createInvitation = useCreateInvitation();
	const revokeInvitation = useRevokeInvitation();

	const pendingCount = invitationsQuery.data?.pendingCount ?? 0;
	const maxPending = invitationsQuery.data?.maxPending ?? 10;
	const isAtLimit = pendingCount >= maxPending;

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) {
			setServerError(null);
			setEmail("");
		}
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setServerError(null);

		try {
			await createInvitation.mutateAsync({ email });
			setEmail("");
		} catch (error) {
			setServerError(
				error instanceof Error
					? error.message
					: "Não foi possível enviar o convite.",
			);
		}
	}

	async function handleRevoke(id: string) {
		setServerError(null);
		try {
			await revokeInvitation.mutateAsync(id);
		} catch (error) {
			setServerError(
				error instanceof Error
					? error.message
					: "Não foi possível cancelar o convite.",
			);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size="sm" className="gap-2">
					<Mail className="size-4" />
					<span className="hidden sm:inline">Convidar</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Convidar usuário</DialogTitle>
					<DialogDescription>
						Envie um convite por e-mail. Cada convite é válido por 7 dias.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="flex gap-2">
						<Input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="email@escola.com"
							autoComplete="email"
							aria-label="Email do convidado"
							disabled={createInvitation.isPending || isAtLimit}
							required
						/>
						<Button
							type="submit"
							disabled={createInvitation.isPending || isAtLimit}
							className="shrink-0 gap-2"
						>
							<Send className="size-4" />
							{createInvitation.isPending ? "Enviando..." : "Enviar"}
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						{pendingCount} de {maxPending} convites pendentes disponíveis.
					</p>
				</form>

				{isAtLimit && (
					<Alert variant="default">
						<AlertDescription>
							Você atingiu o limite de {maxPending} convites pendentes. Cancele
							um convite ou aguarde sua aceitação ou expiração.
						</AlertDescription>
					</Alert>
				)}

				{serverError && (
					<Alert variant="destructive">
						<AlertDescription>{serverError}</AlertDescription>
					</Alert>
				)}

				<div className="border-t pt-4">
					<div className="mb-2 flex items-center justify-between">
						<h3 className="text-sm font-medium">Convites enviados</h3>
						{invitationsQuery.isLoading && (
							<span className="text-xs text-muted-foreground">
								Carregando...
							</span>
						)}
					</div>

					{invitationsQuery.isError ? (
						<p className="text-sm text-destructive">
							Não foi possível carregar seus convites.
						</p>
					) : invitationsQuery.data?.data.length ? (
						<ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
							{invitationsQuery.data.data.map((invitation) => (
								<li
									key={invitation.id}
									className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
								>
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium">{invitation.email}</p>
										<p className="text-xs text-muted-foreground">
											Expira em{" "}
											{new Date(invitation.expiresAt).toLocaleDateString(
												"pt-BR",
											)}
										</p>
									</div>
									<span
										className={`rounded-full px-2 py-0.5 text-xs font-medium ${invitationStatusClass(invitation.status)}`}
									>
										{invitationStatusLabel(invitation.status)}
									</span>
									{invitation.status === "pending" && (
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="size-7 text-muted-foreground hover:text-destructive"
											onClick={() => handleRevoke(invitation.id)}
											disabled={revokeInvitation.isPending}
											aria-label={`Cancelar convite para ${invitation.email}`}
										>
											<X className="size-4" />
										</Button>
									)}
								</li>
							))}
						</ul>
					) : (
						<p className="py-3 text-center text-sm text-muted-foreground">
							Nenhum convite enviado ainda.
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
