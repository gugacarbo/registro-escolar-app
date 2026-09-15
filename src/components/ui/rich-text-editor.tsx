"use client";

import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "cn";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	ImageIcon,
	Italic,
	List,
	ListOrdered,
	Minus,
	Redo,
	UnderlineIcon,
	Undo,
	Variable,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { Separator } from "#/components/ui/separator";
import { imageFileToInlineBase64 } from "#/lib/minutes/tiptap/image-utils";
import {
	MinutePlaceholder,
	PLACEHOLDER_TYPES,
} from "#/lib/minutes/tiptap/placeholder-node";

type RichTextEditorProps = {
	id?: string;
	"aria-label"?: string;
	"aria-describedby"?: string;
	value: Record<string, unknown> | null | undefined;
	onChange: (value: Record<string, unknown>) => void;
	placeholder?: string;
	className?: string;
	showPlaceholders?: boolean;
	imageError?: (error: string) => void;
};

const DEFAULT_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function RichTextEditor({
	id,
	"aria-label": ariaLabel,
	"aria-describedby": ariaDescribedBy,
	value,
	onChange,
	placeholder = "Digite aqui...",
	className,
	showPlaceholders = true,
	imageError,
}: RichTextEditorProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [lastImageError, setLastImageError] = useState<string | null>(null);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				hardBreak: { keepMarks: true },
				underline: false,
			}),
			Image.configure({
				allowBase64: true,
				inline: true,
			}),
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			Underline,
			MinutePlaceholder,
		],
		editorProps: {
			attributes: {
				...(id ? { id } : {}),
				...(ariaLabel ? { "aria-label": ariaLabel } : {}),
				...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
				role: "textbox",
				"aria-multiline": "true",
				class: "min-h-[160px] outline-none px-3 py-2 prose prose-sm max-w-none",
			},
		},
		content: normalizeContent(value),
		onUpdate: ({ editor }) => {
			onChange(editor.getJSON());
		},
	});

	const handleImageUpload = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file || !editor) return;
			const result = await imageFileToInlineBase64(file);
			if (result.error) {
				setLastImageError(result.error);
				imageError?.(result.error);
				return;
			}
			setLastImageError(null);
			editor
				.chain()
				.focus()
				.setImage({ src: result.src, alt: result.alt })
				.run();
		},
		[editor, imageError],
	);

	const insertPlaceholder = useCallback(
		(type: string, label: string) => {
			if (!editor) return;
			editor
				.chain()
				.focus()
				.insertContent({
					type: "minutePlaceholder",
					attrs: { "data-type": type, label },
				})
				.run();
		},
		[editor],
	);

	if (!editor) {
		return (
			<div
				id={id}
				role="textbox"
				aria-label={ariaLabel}
				aria-describedby={ariaDescribedBy}
				className={cn(
					"rounded-md border bg-card text-card-foreground shadow-sm",
					className,
				)}
			>
				<div className="h-10 animate-pulse bg-muted" />
				<div className="min-h-[160px] p-3 text-sm text-muted-foreground">
					{placeholder}
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"rounded-md border bg-card text-card-foreground shadow-sm focus-within:ring-1 focus-within:ring-ring",
				className,
			)}
		>
			<div className="flex flex-wrap items-center gap-1 border-b bg-muted/50 p-1">
				<ToolbarButton
					editor={editor}
					command="toggleBold"
					isActive="bold"
					label="Negrito"
				>
					<Bold className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					command="toggleItalic"
					isActive="italic"
					label="Itálico"
				>
					<Italic className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					command="toggleUnderline"
					isActive="underline"
					label="Sublinhado"
				>
					<UnderlineIcon className="size-4" />
				</ToolbarButton>
				<Separator orientation="vertical" className="mx-1 h-6" />
				<ToolbarButton
					editor={editor}
					command="toggleBulletList"
					isActive="bulletList"
					label="Lista com marcadores"
				>
					<List className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					command="toggleOrderedList"
					isActive="orderedList"
					label="Lista numerada"
				>
					<ListOrdered className="size-4" />
				</ToolbarButton>
				<Separator orientation="vertical" className="mx-1 h-6" />
				<AlignButton editor={editor} align="left" />
				<AlignButton editor={editor} align="center" />
				<AlignButton editor={editor} align="right" />
				<Separator orientation="vertical" className="mx-1 h-6" />
				<ToolbarButton
					editor={editor}
					command="setHorizontalRule"
					label="Separador"
				>
					<Minus className="size-4" />
				</ToolbarButton>
				<Separator orientation="vertical" className="mx-1 h-6" />
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label="Inserir imagem"
					onClick={() => fileInputRef.current?.click()}
				>
					<ImageIcon className="size-4" />
				</Button>
				{showPlaceholders && (
					<Popover>
						<PopoverTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								aria-label="Inserir variável"
							>
								<Variable className="size-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-56 p-2">
							<div className="text-xs font-medium text-muted-foreground mb-1">
								Informações dinâmicas
							</div>
							<div className="flex flex-col gap-1">
								{PLACEHOLDER_TYPES.map(({ type, label }) => (
									<Button
										key={type}
										type="button"
										variant="ghost"
										size="sm"
										className="justify-start"
										onClick={() => insertPlaceholder(type, label)}
									>
										{label}
									</Button>
								))}
							</div>
						</PopoverContent>
					</Popover>
				)}
				<div className="ml-auto flex items-center gap-1">
					<ToolbarButton
						editor={editor}
						command="undo"
						label="Desfazer"
						noActive
					>
						<Undo className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						editor={editor}
						command="redo"
						label="Refazer"
						noActive
					>
						<Redo className="size-4" />
					</ToolbarButton>
				</div>
			</div>
			{lastImageError && (
				<p className="px-3 pt-2 text-xs text-destructive" role="alert">
					{lastImageError}
				</p>
			)}
			<EditorContent
				editor={editor}
				className="[&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2"
			/>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/png,image/jpeg,image/webp,image/gif"
				className="hidden"
				onChange={handleImageUpload}
			/>
		</div>
	);
}

function ToolbarButton({
	editor,
	command,
	isActive,
	label,
	noActive,
	children,
}: {
	editor: Editor;
	command: string;
	isActive?: string;
	label: string;
	noActive?: boolean;
	children: React.ReactNode;
}) {
	const active = isActive ? editor.isActive(isActive) : false;
	return (
		<Button
			type="button"
			variant={active && !noActive ? "secondary" : "ghost"}
			size="icon-xs"
			aria-label={label}
			aria-pressed={active}
			onClick={() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				void (editor.chain().focus() as any)[command]().run();
			}}
		>
			{children}
		</Button>
	);
}

function AlignButton({
	editor,
	align,
}: {
	editor: Editor;
	align: "left" | "center" | "right";
}) {
	const Icon =
		align === "left"
			? AlignLeft
			: align === "center"
				? AlignCenter
				: AlignRight;
	return (
		<Button
			type="button"
			variant={editor.isActive({ textAlign: align }) ? "secondary" : "ghost"}
			size="icon-xs"
			aria-label={`Alinhar ${align}`}
			onClick={() => editor.chain().focus().setTextAlign(align).run()}
		>
			<Icon className="size-4" />
		</Button>
	);
}

function normalizeContent(
	value: Record<string, unknown> | string | null | undefined,
): Record<string, unknown> {
	if (!value) {
		return DEFAULT_DOC;
	}
	if (typeof value === "string") {
		try {
			return JSON.parse(value) as Record<string, unknown>;
		} catch {
			return DEFAULT_DOC;
		}
	}
	return value;
}
