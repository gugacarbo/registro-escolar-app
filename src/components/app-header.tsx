import { InvitationDialog } from "#/components/invitations/invitation-dialog";
import { ModeToggle } from "#/components/mode-toggle";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { SidebarTrigger } from "#/components/ui/sidebar";

interface AppHeaderProps {
	userName: string | null;
	userEmail: string | null;
	onSignOut: () => void;
}

export function AppHeader({ userName, userEmail, onSignOut }: AppHeaderProps) {
	return (
		<header className="sticky top-0 z-30 flex items-center gap-3 border-b border-primary/12 bg-background/88 px-4 py-3 shadow-[0_8px_30px_-24px_color-mix(in_oklab,var(--primary)_65%,transparent)] backdrop-blur-md sm:px-6">
			<SidebarTrigger />
			<div className="min-w-0 flex-1">
				{userName && <p className="truncate text-sm font-medium">{userName}</p>}
				{userEmail && (
					<p className="truncate text-xs text-muted-foreground">{userEmail}</p>
				)}
			</div>
			<ModeToggle />
			<InvitationDialog />
			<Separator orientation="vertical" className="hidden h-6 sm:block" />
			<Button type="button" variant="outline" size="sm" onClick={onSignOut}>
				Sair
			</Button>
		</header>
	);
}
