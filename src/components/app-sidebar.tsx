import { Link, useLocation } from "@tanstack/react-router";
import {
	BookOpenText,
	CalendarDays,
	FileText,
	GraduationCap,
	Home,
	type LucideIcon,
	School,
	UsersRound,
} from "lucide-react";

import { Badge } from "#/components/ui/badge";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "#/components/ui/sidebar";

type AppRoute =
	| "/"
	| "/students"
	| "/students/new"
	| "/students/import"
	| "/staff"
	| "/staff/new"
	| "/roles"
	| "/roles/new";

interface NavSubItem {
	title: string;
	to: AppRoute;
}

interface NavItem {
	title: string;
	icon: LucideIcon;
	/** Ausente = seção futura (SPEC ainda sem rota), renderizada desabilitada. */
	to?: AppRoute;
	children?: NavSubItem[];
}

interface NavGroup {
	label: string;
	items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
	{
		label: "Principal",
		items: [
			{ title: "Início", to: "/", icon: Home },
			{
				title: "Alunos",
				to: "/students",
				icon: GraduationCap,
				children: [
					{ title: "Todos os alunos", to: "/students" },
					{ title: "Novo aluno", to: "/students/new" },
					{ title: "Importar", to: "/students/import" },
				],
			},
		],
	},
	{
		label: "Gestão",
		items: [
			{ title: "Turmas", icon: School },
			{
				title: "Servidores",
				to: "/staff",
				icon: UsersRound,
				children: [
					{ title: "Todos os servidores", to: "/staff" },
					{ title: "Novo servidor", to: "/staff/new" },
					{ title: "Papéis", to: "/roles" },
					{ title: "Novo papel", to: "/roles/new" },
				],
			},
			{ title: "Componentes", icon: BookOpenText },
		],
	},
	{
		label: "Reuniões",
		items: [
			{ title: "Reuniões", icon: CalendarDays },
			{ title: "Atas", icon: FileText },
		],
	},
];

function normalize(path: string): string {
	return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function isActivePath(pathname: string, to: AppRoute, exact = false): boolean {
	const current = normalize(pathname);
	const target = normalize(to);
	if (exact) return current === target;
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
				{NAV_GROUPS.map((group) => (
					<SidebarGroup key={group.label}>
						<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{group.items.map((item) => (
									<SidebarMenuItem key={item.title}>
										{item.to ? (
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
										) : (
											<SidebarMenuButton disabled tooltip={item.title}>
												<item.icon />
												<span>{item.title}</span>
												<Badge
													variant="secondary"
													className="ml-auto text-[10px] group-data-[collapsible=icon]:hidden"
												>
													Em breve
												</Badge>
											</SidebarMenuButton>
										)}
										{item.children && (
											<SidebarMenuSub>
												{item.children.map((child) => (
													<SidebarMenuSubItem key={child.to}>
														<SidebarMenuSubButton
															asChild
															isActive={isActivePath(pathname, child.to, true)}
														>
															<Link to={child.to}>
																<span>{child.title}</span>
															</Link>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												))}
											</SidebarMenuSub>
										)}
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>
		</Sidebar>
	);
}
