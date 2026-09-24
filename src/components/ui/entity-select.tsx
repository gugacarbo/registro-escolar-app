import { SearchableSelect } from "#/components/ui/searchable-select";

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
	return (
		<SearchableSelect
			label={label}
			placeholder={placeholder}
			value={value}
			onChange={onChange}
			options={options}
			isLoading={isLoading}
			emptyMessage={`Nenhum ${label.toLowerCase()} encontrado para a busca.`}
			hint={
				!isLoading && !loadedAll
					? `Mostrando ${options.length} de ${total}. Refine a busca para ver mais.`
					: undefined
			}
			search={search}
			onSearchChange={onSearchChange}
			disabled={disabled}
		/>
	);
}
