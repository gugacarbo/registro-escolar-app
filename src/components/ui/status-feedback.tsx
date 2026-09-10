import { cn } from "cn";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingFeedback({
	children = "Carregando...",
	className,
}: {
	children?: ReactNode;
	className?: string;
}) {
	return (
		<p
			role="status"
			aria-live="polite"
			className={cn(
				"flex items-center gap-2 text-sm text-muted-foreground",
				className,
			)}
		>
			<LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
			{children}
		</p>
	);
}

export function ErrorFeedback({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<p
			role="alert"
			className={cn(
				"rounded-md border border-destructive/35 bg-destructive/8 px-3 py-2 text-sm text-destructive",
				className,
			)}
		>
			{children}
		</p>
	);
}
