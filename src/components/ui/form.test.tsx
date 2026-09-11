// @vitest-environment happy-dom
// react-hook-form 7.87 + zodResolver quebra no happy-dom (useController lê
// um mapa interno `_names`); seguimos o padrão dos testes do repositório e
// substituímos o contexto por um stub em vez de subir um form real.

import { render, screen } from "@testing-library/react";
import type * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-hook-form", () => {
	const error = { message: "O nome é obrigatório" };
	return {
		FormProvider: ({
			children,
		}: UseFormReturn & { children: React.ReactNode }) => <>{children}</>,
		Controller: ({ render }: { render: (props: unknown) => React.ReactNode }) =>
			(render as (props: { field: { name: string } }) => React.ReactNode)({
				field: { name: "nome" },
			}),
		useFormContext: () => ({
			getFieldState: () => ({
				isInvalid: true,
				isTouched: true,
				isValidating: false,
				error,
			}),
			handleSubmit: () => () => {},
			reset: () => {},
		}),
		useFormState: () => ({}) as Record<string, unknown>,
		useForm: () => ({}),
		useWatch: () => undefined,
		useFieldArray: () => ({}),
		useController: () => ({}),
	};
});

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "./form";
import { Input } from "./input";

// O runtime vem do mock; em typecheck, FormProvider 7.87 espalha o form.
const dummyForm = {} as UseFormReturn;

function NameField() {
	return (
		<Form {...dummyForm}>
			<FormField
				name="nome"
				render={() => (
					<FormItem>
						<FormLabel>Nome</FormLabel>
						<FormControl>
							<Input aria-label="Nome" />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</Form>
	);
}

describe("FormMessage", () => {
	it("anuncia a mensagem de erro com role alert", () => {
		render(<NameField />);

		const message = screen.getByRole("alert");
		expect(message).toHaveTextContent("O nome é obrigatório");
	});

	it("usa o id da mensagem no aria-describedby do campo", () => {
		render(<NameField />);

		const message = screen.getByRole("alert");
		const input = screen.getByRole("textbox", { name: "Nome" });

		const formItemId = message.id.replace(/-form-item-message$/, "-form-item");
		expect(input).toHaveAttribute("id", formItemId);
		expect(input).toHaveAttribute(
			"aria-describedby",
			expect.stringContaining(message.id),
		);
		expect(input).toHaveAttribute("aria-invalid", "true");
	});
});
