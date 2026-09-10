import { Search, X } from "lucide-react";

import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";

export function SearchInput({
	value,
	onChange,
	placeholder,
	ariaLabel,
	className,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	ariaLabel: string;
	className?: string;
}) {
	return (
		<InputGroup className={className}>
			<InputGroupAddon align="inline-start">
				<Search aria-hidden="true" />
			</InputGroupAddon>
			<InputGroupInput
				type="search"
				placeholder={placeholder}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				aria-label={ariaLabel}
			/>
			{value.length > 0 && (
				<InputGroupAddon align="inline-end">
					<InputGroupButton
						size="icon-xs"
						aria-label="Limpar campo de busca"
						onClick={() => onChange("")}
					>
						<X />
					</InputGroupButton>
				</InputGroupAddon>
			)}
		</InputGroup>
	);
}
