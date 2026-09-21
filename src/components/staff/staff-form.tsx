import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "#/components/ui/button";
import { EntitySelect } from "#/components/ui/entity-select";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormNative,
	FormSubmit,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { fetchRolesPage } from "#/hooks/entity-fetchers";
import { useAsyncOptions } from "#/hooks/use-async-options";

export type StaffFormValues = {
	name: string;
	email?: string;
	phone?: string;
	notes?: string;
	defaultRoleId?: string | null;
};

export function StaffForm({
	onSubmit,
	submitLabel = "Salvar",
	defaultValues,
	serverError,
}: {
	onSubmit: (values: StaffFormValues) => void | Promise<void>;
	submitLabel?: string;
	defaultValues?: Partial<StaffFormValues>;
	serverError?: string | null;
}) {
	const [roleSearch, setRoleSearch] = useState("");
	const { data: rolesResult, isLoading: isLoadingRoles } = useAsyncOptions({
		queryKey: ["staff-form", "roles"],
		search: roleSearch,
		fetchPage: fetchRolesPage,
		select: (role) => ({ id: role.id, name: role.name }),
	});
	const roleOptions = rolesResult?.options ?? [];
	const form = useForm<StaffFormValues>({
		defaultValues: {
			name: "",
			email: "",
			phone: "",
			notes: "",
			defaultRoleId: null,
			...defaultValues,
		},
	});

	return (
		<Form {...form}>
			<FormNative
				onSubmit={() => form.handleSubmit(onSubmit)()}
				className="space-y-4"
			>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Nome *</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="defaultRoleId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Cargo padrão</FormLabel>
							<EntitySelect
								label="Cargo padrão"
								placeholder="Selecione um cargo"
								value={field.value ?? ""}
								onChange={field.onChange}
								options={[
									...roleOptions,
									...(field.value &&
									!roleOptions.some((role) => role.id === field.value)
										? [{ id: field.value, name: field.value }]
										: []),
								]}
								isLoading={isLoadingRoles}
								total={rolesResult?.total ?? 0}
								loadedAll={rolesResult?.loadedAll ?? true}
								search={roleSearch}
								onSearchChange={setRoleSearch}
							/>
							{field.value && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => field.onChange(null)}
								>
									Remover cargo padrão
								</Button>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input {...field} type="email" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="phone"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Telefone</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{serverError && (
					<p className="text-sm text-destructive">{serverError}</p>
				)}
				<FormSubmit>{submitLabel}</FormSubmit>
			</FormNative>
		</Form>
	);
}
