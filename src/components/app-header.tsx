import { ModeToggle } from "#/components/mode-toggle";
import { Button } from "#/components/ui/button";
import { SidebarTrigger } from "#/components/ui/sidebar";

interface AppHeaderProps {
	userName: string | null;
	userEmail: string | null;
	onSignOut: () => void;
}

export function AppHeader({ userName, userEmail, onSignOut }: AppHeaderProps) {
	return (
		<header className="flex items-center gap-2 border-b px-4 py-3">
			<SidebarTrigger />
			<div className="min-w-0 flex-1">
				{userName && <p className="truncate text-sm font-medium">{userName}</p>}
				{userEmail && (
					<p className="truncate text-xs text-muted-foreground">{userEmail}</p>
				)}
			</div>
			<ModeToggle />
			<Button type="button" variant="outline" size="sm" onClick={onSignOut}>
				Sair
			</Button>
		</header>
	);
}
