import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "#/components/ui/button";

export function PwaUpdatePrompt() {
	const {
		needRefresh: [needRefresh],
		updateServiceWorker,
	} = useRegisterSW();

	if (!needRefresh) {
		return null;
	}

	return (
		<div
			role="alert"
			aria-live="polite"
			className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-lg sm:flex-row sm:items-center sm:justify-between"
		>
			<div>
				<p className="text-sm font-medium">Nova versão disponível</p>
				<p className="text-sm text-muted-foreground">
					Atualize para usar a versão mais recente.
				</p>
			</div>
			<div className="flex shrink-0 gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => updateServiceWorker(false)}
				>
					Depois
				</Button>
				<Button
					type="button"
					size="sm"
					onClick={() => updateServiceWorker(true)}
				>
					Atualizar
				</Button>
			</div>
		</div>
	);
}
