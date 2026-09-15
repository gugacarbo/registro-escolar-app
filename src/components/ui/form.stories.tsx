import type { Meta, StoryObj } from "@storybook/react-vite";
import { useForm } from "react-hook-form";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormSubmit,
} from "./form.tsx";
import { Input } from "./input.tsx";
import { Textarea } from "./textarea.tsx";

const meta = {
	title: "UI/Form",
	component: Form,
	parameters: {
		layout: "centered",
	},
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

type Valores = {
	nome: string;
	email: string;
	observacoes: string;
};

function FormDemo({ comValidacao }: { comValidacao?: boolean }) {
	const form = useForm<Valores>({
		defaultValues: { nome: "", email: "", observacoes: "" },
		mode: comValidacao ? "onChange" : "onSubmit",
	});
	return (
		<Form {...form}>
			<form
				className="w-80 space-y-4"
				onSubmit={form.handleSubmit((v) => console.log(v))}
			>
				<FormField
					control={form.control}
					name="nome"
					rules={{ required: "Informe o nome do aluno." }}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Nome</FormLabel>
							<FormControl>
								<Input placeholder="Nome completo" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="email"
					rules={{
						required: "Informe o e-mail.",
						pattern: {
							value: /^\S+@\S+\.\S+$/,
							message: "E-mail inválido.",
						},
					}}
					render={({ field }) => (
						<FormItem>
							<FormLabel>E-mail</FormLabel>
							<FormControl>
								<Input type="email" placeholder="a@b.com" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="observacoes"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Observações</FormLabel>
							<FormControl>
								<Textarea placeholder="Opcional" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormSubmit>Enviar</FormSubmit>
			</form>
		</Form>
	);
}

export const Padrao: Story = {
	render: () => <FormDemo />,
};

export const ComValidacao: Story = {
	render: () => <FormDemo comValidacao />,
};
