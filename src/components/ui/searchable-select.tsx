import { cn } from "cn";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "#/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";

export type SearchableOption = { id: string; name: string };

/**
 * Select pesquisável de controle único (trigger + popup com busca).
 * Compatível com react-hook-form via `value`/`onChange` e com busca
 * assíncrona controlada via `search`/`onSearchChange`.
 */
export function SearchableSelect({
	label,
	placeholder,
	searchPlaceholder,
	emptyMessage,
	value,
	onChange,
	options,
	isLoading,
	loadingMessage,
	hint,
	search,
	onSearchChange,
	disabled,
}: {
	label: string;
	placeholder: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	value: string;
	onChange: (value: string) => void;
	options: SearchableOption[];
	isLoading?: boolean;
	loadingMessage?: string;
	hint?: string;
	search: string;
	onSearchChange: (value: string) => void;
	disabled?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const statusId = useId();
	const selected = options.find((option) => option.id === value);

	return (
		<div className="grid gap-1">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						role="combobox"
						aria-expanded={open}
						aria-label={label}
						disabled={disabled}
						className={cn(
							"w-full justify-between font-normal",
							!selected && "text-muted-foreground",
						)}
					>
						<span className="truncate">
							{selected ? selected.name : placeholder}
						</span>
						<ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="w-(--radix-popover-trigger-width) p-0"
					align="start"
				>
					<Command shouldFilter={false}>
						<CommandInput
							placeholder={
								searchPlaceholder ?? `Buscar ${label.toLowerCase()}...`
							}
							value={search}
							onValueChange={onSearchChange}
						/>
						<CommandList>
							{isLoading ? (
								<p
									role="status"
									className="px-3 py-2 text-sm text-muted-foreground"
								>
									{loadingMessage ?? `Carregando ${label.toLowerCase()}...`}
								</p>
							) : (
								<>
									<CommandEmpty>
										{emptyMessage ??
											`Nenhum ${label.toLowerCase()} encontrado para a busca.`}
									</CommandEmpty>
									<CommandGroup>
										{options.map((option) => (
											<CommandItem
												key={option.id}
												value={option.id}
												onSelect={() => {
													onChange(option.id);
													setOpen(false);
												}}
											>
												<CheckIcon
													className={cn(
														"size-4",
														value === option.id ? "opacity-100" : "opacity-0",
													)}
												/>
												{option.name}
											</CommandItem>
										))}
									</CommandGroup>
								</>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{hint && (
				<p
					id={statusId}
					role="status"
					className="text-xs text-muted-foreground"
				>
					{hint}
				</p>
			)}
		</div>
	);
}
