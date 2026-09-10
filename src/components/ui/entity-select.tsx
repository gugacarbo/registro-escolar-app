import { useId } from "react";

import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";

export type EntityOption = { id: string; name: string };

export function EntitySelect({
	label,
	placeholder,
	value,
	onChange,
	options,
	isLoading,
	total,
	loadedAll,
	search,
	onSearchChange,
	disabled,
}: {
	label: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
	options: EntityOption[];
	isLoading: boolean;
	total: number;
	loadedAll: boolean;
	search: string;
	onSearchChange: (value: string) => void;
	disabled?: boolean;
}) {
	const searchId = useId();
	const statusId = useId();
	return (
		<div className="grid gap-2">
			<Input
				id={searchId}
				value={search}
				onChange={(event) => onSearchChange(event.target.value)}
				placeholder={`Buscar ${label.toLowerCase()}`}
				aria-label={`Buscar ${label.toLowerCase()}`}
				disabled={disabled}
			/>
			<Select
				value={value}
				onValueChange={onChange}
				disabled={disabled || (options.length === 0 && !isLoading)}
			>
				<SelectTrigger aria-label={label}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.id} value={option.id}>
							{option.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{isLoading && (
				<p
					id={statusId}
					role="status"
					className="text-xs text-muted-foreground"
				>
					Carregando {label.toLowerCase()}...
				</p>
			)}
			{!isLoading && options.length === 0 && (
				<p
					id={statusId}
					role="status"
					className="text-xs text-muted-foreground"
				>
					Nenhum {label.toLowerCase()} encontrado para a busca.
				</p>
			)}
			{!isLoading && !loadedAll && (
				<p
					id={statusId}
					role="status"
					className="text-xs text-muted-foreground"
				>
					Mostrando {options.length} de {total}. Refine a busca para ver mais.
				</p>
			)}
		</div>
	);
}
