import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/minutes/templates")({
	component: MinuteTemplatesLayout,
});

function MinuteTemplatesLayout() {
	return <Outlet />;
}
