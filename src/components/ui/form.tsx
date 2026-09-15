"use client";

import { cn } from "cn";
import type { Label as LabelPrimitive } from "radix-ui";
import { Slot } from "radix-ui";
import * as React from "react";
import {
	Controller,
	type ControllerProps,
	type FieldPath,
	type FieldValues,
	FormProvider,
	useController,
	useFieldArray,
	useForm,
	useFormContext,
	useFormState,
	useWatch,
} from "react-hook-form";

import { Button } from "#/components/ui/button.tsx";
import { Label } from "#/components/ui/label.tsx";

const Form = FormProvider;

type FormFieldContextValue<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
	name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
	{} as FormFieldContextValue,
);

const FormField = <
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	...props
}: ControllerProps<TFieldValues, TName>) => {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
};

const useFormField = () => {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { getFieldState } = useFormContext();
	const formState = useFormState({ name: fieldContext.name });
	const fieldState = getFieldState(fieldContext.name, formState);

	if (!fieldContext.name) {
		throw new Error("useFormField should be used within <FormField>");
	}

	const { id } = itemContext;

	return {
		id,
		name: fieldContext.name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		...fieldState,
	};
};

type FormItemContextValue = {
	id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
	{} as FormItemContextValue,
);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id }}>
			<div
				data-slot="form-item"
				className={cn("grid gap-2", className)}
				{...props}
			/>
		</FormItemContext.Provider>
	);
}

function FormLabel({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
	const { error, formItemId } = useFormField();

	return (
		<Label
			data-slot="form-label"
			data-error={!!error}
			className={cn("data-[error=true]:text-destructive", className)}
			htmlFor={formItemId}
			{...props}
		/>
	);
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
	const { error, formItemId, formDescriptionId, formMessageId } =
		useFormField();

	return (
		<Slot.Root
			data-slot="form-control"
			id={formItemId}
			aria-describedby={
				!error
					? `${formDescriptionId}`
					: `${formDescriptionId} ${formMessageId}`
			}
			aria-invalid={!!error}
			{...props}
		/>
	);
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
	const { formDescriptionId } = useFormField();

	return (
		<p
			data-slot="form-description"
			id={formDescriptionId}
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
	const { error, formMessageId } = useFormField();
	const body = error ? String(error?.message ?? "") : props.children;

	if (!body) {
		return null;
	}

	return (
		<p
			data-slot="form-message"
			id={formMessageId}
			role="alert"
			className={cn("text-sm text-destructive", className)}
			{...props}
		>
			{body}
		</p>
	);
}

type FormNativeProps = Omit<React.ComponentProps<"form">, "onSubmit"> & {
	onSubmit?: () => void;
};

const FormNative = React.forwardRef<HTMLFormElement, FormNativeProps>(
	({ onSubmit, ...props }, ref) => {
		const { handleSubmit, reset } = useFormContext();

		return (
			<form
				ref={ref}
				onSubmit={onSubmit ? handleSubmit(onSubmit) : undefined}
				onReset={() => reset()}
				{...props}
			/>
		);
	},
);
FormNative.displayName = "FormNative";

type FormSubmitProps = React.ComponentProps<typeof Button> & {
	children?: React.ReactNode;
};

function FormSubmit({ children, disabled, ...props }: FormSubmitProps) {
	const { isSubmitting } = useFormState();

	return (
		<Button
			type="submit"
			disabled={disabled || isSubmitting}
			data-pending={isSubmitting}
			{...props}
		>
			{children ?? "Salvar"}
		</Button>
	);
}

type FormResetProps = React.ComponentProps<typeof Button> & {
	children?: React.ReactNode;
};

function FormReset({ children, onClick, ...props }: FormResetProps) {
	const { reset } = useFormContext();

	return (
		<Button
			type="reset"
			variant="outline"
			onClick={(event) => {
				reset();
				onClick?.(event);
			}}
			{...props}
		>
			{children ?? "Limpar"}
		</Button>
	);
}

export {
	Controller,
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormNative,
	FormProvider,
	FormReset,
	FormSubmit,
	useController,
	useFieldArray,
	useForm,
	useFormContext,
	useFormField,
	useWatch,
};
