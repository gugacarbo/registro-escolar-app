import { Link, useLocation } from "@tanstack/react-router";
import {
	BookOpenText,
	Briefcase,
	CalendarDays,
	FileText,
	GraduationCap,
	LayoutGrid,
	type LucideIcon,
	Shield,
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

type AppRoute =
	| "/students"
	| "/classes"
	| "/staff"
	| "/roles"
	| "/components"
	| "/meetings"
	| "/minutes";

interface NavItem {
	title: string;
	icon: LucideIcon;
	to: AppRoute;
}

const NAV_ITEMS: NavItem[] = [
	{ title: "Alunos", to: "/students", icon: GraduationCap },
	{ title: "Turmas", to: "/classes", icon: LayoutGrid },
	{ title: "Servidores", to: "/staff", icon: Briefcase },
	{ title: "Papéis", to: "/roles", icon: Shield },
	{ title: "Componentes", to: "/components", icon: BookOpenText },
	{ title: "Reuniões", to: "/meetings", icon: CalendarDays },
	{ title: "Atas", to: "/minutes", icon: FileText },
];

function normalize(path: string): string {
	return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function isActivePath(pathname: string, to: AppRoute): boolean {
	const current = normalize(pathname);
	const target = normalize(to);
	return current === target || current.startsWith(`${target}/`);
}

export function AppSidebar() {
	const pathname = useLocation({ select: (s) => s.pathname });

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<div className="flex items-center gap-2 px-2 py-1">
					<span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
						<GraduationCap className="size-4" />
					</span>
					<span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
						Registro Escolar
					</span>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{NAV_ITEMS.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										asChild
										isActive={isActivePath(pathname, item.to)}
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
