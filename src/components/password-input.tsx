import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";

const PasswordInput = forwardRef<
	HTMLInputElement,
	React.ComponentProps<"input">
>(({ className, ...props }, ref) => {
	const [isVisible, setIsVisible] = useState(false);

	return (
		<div className="relative">
			<Input
				{...props}
				ref={ref}
				type={isVisible ? "text" : "password"}
				className={className ? `${className} pr-10` : "pr-10"}
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				className="absolute top-1/2 right-1 -translate-y-1/2"
				aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
				aria-pressed={isVisible}
				onClick={() => setIsVisible((visible) => !visible)}
			>
				{isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
			</Button>
		</div>
	);
});

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
