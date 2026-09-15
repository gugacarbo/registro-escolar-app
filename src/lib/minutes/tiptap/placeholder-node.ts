import { mergeAttributes, Node } from "@tiptap/core";

export type PlaceholderType =
	| "meeting-title"
	| "meeting-date"
	| "meeting-location"
	| "school-name"
	| "classes-list"
	| "participants-list"
	| "records-list"
	| "general-reports-list"
	| "signatures-list";

export const PLACEHOLDER_TYPES: { type: PlaceholderType; label: string }[] = [
	{ type: "meeting-title", label: "Título da reunião" },
	{ type: "meeting-date", label: "Data da reunião" },
	{ type: "meeting-location", label: "Local da reunião" },
	{ type: "school-name", label: "Nome da escola" },
	{ type: "classes-list", label: "Lista de turmas" },
	{ type: "participants-list", label: "Lista de participantes" },
	{ type: "records-list", label: "Registros por estudante" },
	{ type: "general-reports-list", label: "Relatos gerais" },
	{ type: "signatures-list", label: "Assinaturas" },
];

export interface PlaceholderAttributes {
	"data-type": PlaceholderType;
	label: string;
}

export const PLACEHOLDER_NODE_NAME = "minutePlaceholder";

/**
 * Nó inline não-editable que representa uma variável dinâmica do template.
 * Renderiza como um chip visual no editor e é serializado como
 * `<span data-type="...">` no HTML de saída, facilitando a substituição.
 */
export const MinutePlaceholder = Node.create({
	name: PLACEHOLDER_NODE_NAME,
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,
	addAttributes() {
		return {
			"data-type": {
				default: "meeting-title",
				parseHTML: (element) =>
					(element.getAttribute("data-type") as PlaceholderType) ??
					"meeting-title",
				renderHTML: (attributes) => ({
					"data-type": attributes["data-type"],
				}),
			},
			label: {
				default: "",
				parseHTML: (element) => element.getAttribute("data-label") ?? "",
				renderHTML: (attributes) => ({
					"data-label": attributes.label,
				}),
			},
		};
	},
	parseHTML() {
		return [
			{
				tag: `span[data-minute-placeholder]`,
			},
		];
	},
	renderHTML({ HTMLAttributes, node }) {
		return [
			"span",
			mergeAttributes({ "data-minute-placeholder": "true" }, HTMLAttributes),
			node.attrs.label,
		];
	},
	renderText({ node }) {
		return `{{${node.attrs["data-type"]}}}`;
	},
	addNodeView() {
		return ({ node, getPos, editor }) => {
			const pos = getPos();
			const selected =
				typeof pos === "number" &&
				editor.state.selection.from <= pos &&
				pos + node.nodeSize <= editor.state.selection.to;
			const dom = document.createElement("span");
			dom.setAttribute("data-minute-placeholder", "true");
			dom.setAttribute("data-type", node.attrs["data-type"] as string);
			dom.textContent = node.attrs.label as string;
			dom.className = `inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium select-none ${
				selected
					? "bg-primary text-primary-foreground ring-2 ring-primary"
					: "bg-muted text-muted-foreground"
			}`;
			dom.contentEditable = "false";
			return {
				dom,
				contentDOM: undefined,
			};
		};
	},
});
