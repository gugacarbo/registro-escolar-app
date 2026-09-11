import { createContext, useContext } from "react";

import { authClient } from "#/lib/auth-client";

export type ClientSessionData = Awaited<
	ReturnType<typeof authClient.getSession>
>["data"];

export const AuthSessionContext = createContext<ClientSessionData | null>(null);

export function useAuthSession() {
	return useContext(AuthSessionContext);
}
