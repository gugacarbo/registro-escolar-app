import { Link, useLocation } from "@tanstack/react-router";
import {
	BookOpen,
	BookOpenText,
	Briefcase,
	CalendarDays,
	Files,
	FileText,
	GraduationCap,
	LayoutGrid,
	type LucideIcon,
	Shield,
	Users,
} from "lucide-react";

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "#/components/ui/sidebar";
import { useAuthSession } from "#/lib/auth/session-context";

type AppRoute =
	| "/"
	| "/students"
	| "/classes"
	| "/staff"
	| "/roles"
	| "/components"
	| "/meetings"
	| "/minutes"
	| "/minutes/templates"
	| "/admin/users";

interface NavItem {
	title: string;
	icon: LucideIcon;
	to: AppRoute;
}

const NAV_ITEMS: NavItem[] = [
	{ title: "Painel", to: "/", icon: BookOpen },
	{ title: "Estudantes", to: "/students", icon: GraduationCap },
	{ title: "Turmas", to: "/classes", icon: LayoutGrid },
	{ title: "Servidores", to: "/staff", icon: Briefcase },
	{ title: "Cargos", to: "/roles", icon: Shield },
	{ title: "Componentes", to: "/components", icon: BookOpenText },
	{ title: "Reuniões", to: "/meetings", icon: CalendarDays },
	{ title: "Atas", to: "/minutes", icon: FileText },
	{ title: "Modelos de Ata", to: "/minutes/templates", icon: Files },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
	{ title: "Usuários", to: "/admin/users", icon: Users },
];

function normalize(path: string): string {
	return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function isActivePath(pathname: string, to: AppRoute): boolean {
	const current = normalize(pathname);
	const target = normalize(to);
	return current === target || current.startsWith(`${target}/`);
}

function getActivePath(pathname: string, items: NavItem[]): AppRoute | null {
	return (
		items
			.filter((item) => isActivePath(pathname, item.to))
			.sort((a, b) => b.to.length - a.to.length)[0]?.to ?? null
	);
}

export function AppSidebar() {
	const pathname = useLocation({ select: (s) => s.pathname });
	const session = useAuthSession();
	const role = (session?.user as { role?: string } | undefined)?.role;
	const navItems =
		role === "admin" ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;
	const activePath = getActivePath(pathname, navItems);

	return (
		<Sidebar collapsible="icon" variant="floating">
			<SidebarHeader className="group-data-[collapsible=icon]:p-0">
				<div className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0">
					<span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-primary text-primary-foreground shadow-[3px_3px_0_0_color-mix(in_oklab,var(--highlight)_75%,transparent)] group-data-[collapsible=icon]:size-8">
						<GraduationCap className="size-4" aria-hidden="true" />
					</span>
					<span className="min-w-0 group-data-[collapsible=icon]:hidden">
						<span className="block truncate font-display text-base leading-tight font-semibold">
							Registro Escolar
						</span>
						<span className="block truncate text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase group-data-[collapsible=icon]:hidden">
							Conselho de classe
						</span>
					</span>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{navItems.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										asChild
										isActive={activePath === item.to}
										tooltip={item.title}
									>
										<Link to={item.to}>
											<item.icon />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}
