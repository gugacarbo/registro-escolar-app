import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ImportPreviewTable } from "#/components/students/import-preview-table";
import { Button } from "#/components/ui/button";
import { PageHeader, PageShell } from "#/components/ui/page";
import {
	useImportPreview,
	useResolveImport,
} from "#/hooks/students/use-import-students";

export const Route = createFileRoute("/_app/students/import")({
	component: ImportStudentsPage,
});

const STEP_UPLOAD = 0;
const STEP_PREVIEW = 1;
const STEP_RESULT = 2;

const CSV_TEMPLATE = [
	"nome;referencia;documento;matricula;email;telefone;data_nascimento;observacoes",
	"Maria da Silva;REF-2026-001;123.456.789-01;20260001;maria.exemplo@escola.br;(11) 99999-0000;2015-03-10;Observação de exemplo",
].join("\n");

export default function ImportStudentsPage() {
	const navigate = useNavigate();
	const importPreview = useImportPreview();
	const resolveImport = useResolveImport();
	const [step, setStep] = useState(STEP_UPLOAD);
	const [fileName, setFileName] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [preview, setPreview] = useState<Awaited<
		ReturnType<typeof importPreview.mutateAsync>
	> | null>(null);
	const [resolutions, setResolutions] = useState<
		Record<
			number,
			{ action: "create" | "link" | "skip"; existingStudentId?: string }
		>
	>({});
	const [result, setResult] = useState<Awaited<
		ReturnType<typeof resolveImport.mutateAsync>
	> | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleUpload(file: File) {
		setError(null);
		try {
			const data = await importPreview.mutateAsync(file);
			setPreview(data);
			const initialResolutions: typeof resolutions = {};
			for (const row of data.rows) {
				if (row.status === "conflict") {
					initialResolutions[row.index] = { action: "skip" };
				} else if (row.status === "valid") {
					initialResolutions[row.index] = { action: "create" };
				} else {
					initialResolutions[row.index] = { action: "skip" };
				}
			}
			setResolutions(initialResolutions);
			setStep(STEP_PREVIEW);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Erro desconhecido");
		}
	}

	async function handleConfirm() {
		setError(null);
		if (!preview) return;
		const rows = preview.rows
			.map((row) => {
				const resolution = resolutions[row.index];
				if (!resolution) return null;
				return {
					index: row.index,
					action: resolution.action,
					data:
						resolution.action === "create" || resolution.action === "link"
							? {
									name: row.name,
									reference: row.reference,
									document: row.document,
									registrationNumber: row.registrationNumber,
									email: row.email,
									phone: row.phone,
									birthDate: row.birthDate,
									notes: row.notes,
								}
							: undefined,
					existingStudentId: resolution.existingStudentId,
				};
			})
			.filter((r): r is NonNullable<typeof r> => r !== null);

		try {
			const data = await resolveImport.mutateAsync({ rows });
			setResult(data);
			setStep(STEP_RESULT);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Erro desconhecido");
		}
	}

	if (step === STEP_RESULT && result) {
		return (
			<PageShell>
				<h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem]">
					Importação concluída
				</h1>
				<p>
					Criados: {result.created} | Vinculados: {result.linked} | Ignorados:{" "}
					{result.skipped}
				</p>
				<Button onClick={() => navigate({ to: "/students" })}>
					Ver estudantes
				</Button>
			</PageShell>
		);
	}

	if (step === STEP_PREVIEW && preview) {
		const unresolvedConflicts = preview.rows.filter(
			(row) =>
				row.status === "conflict" &&
				!["link", "skip"].includes(resolutions[row.index]?.action ?? ""),
		);
		return (
			<PageShell>
				<h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem]">
					Revisar importação
				</h1>
				<p>
					Total: {preview.summary.total} | Válidos: {preview.summary.valid} |
					Conflitos: {preview.summary.conflicts} | Inválidos:{" "}
					{preview.summary.invalid}
				</p>
				{preview.warnings && preview.warnings.length > 0 && (
					<ul className="text-sm text-amber-600">
						{preview.warnings.map((warning) => (
							<li key={warning}>{warning}</li>
						))}
					</ul>
				)}
				{unresolvedConflicts.length > 0 && (
					<p className="text-sm text-destructive">
						{unresolvedConflicts.length} conflito(s) ainda não resolvido(s) por
						vínculo.
					</p>
				)}
				<ImportPreviewTable
					rows={preview.rows}
					resolutions={resolutions}
					onChangeResolution={(index, resolution) =>
						setResolutions((prev) => ({ ...prev, [index]: resolution }))
					}
				/>
				{error && <p className="text-destructive">{error}</p>}
				<div className="flex gap-2">
					<Button variant="secondary" onClick={() => setStep(STEP_UPLOAD)}>
						Voltar
					</Button>
					<Button onClick={handleConfirm} disabled={resolveImport.isPending}>
						Confirmar importação
					</Button>
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell>
			<PageHeader
				title="Importar estudantes"
			/>
			<div className="flex items-center gap-3">
				<Button
					variant="outline"
					type="button"
					onClick={() => inputRef.current?.click()}
				>
					Selecionar arquivo
				</Button>
				<Button
					variant="ghost"
					type="button"
					onClick={() => {
						const blob = new Blob([`\ufeff${CSV_TEMPLATE}`], {
							type: "text/csv;charset=utf-8",
						});
						const url = URL.createObjectURL(blob);
						const anchor = document.createElement("a");
						anchor.href = url;
						anchor.download = "modelo-importacao-estudantes.csv";
						anchor.click();
						URL.revokeObjectURL(url);
					}}
				>
					Baixar modelo CSV
				</Button>
				{fileName && (
					<span className="text-sm text-muted-foreground">{fileName}</span>
				)}
				<input
					ref={inputRef}
					type="file"
					accept=".csv,.xlsx,.xls,.ods"
					aria-label="Selecionar arquivo para importar"
					className="hidden"
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) {
							setFileName(file.name);
							// reseta o campo nativo: sem isso, escolher o mesmo
							// arquivo de novo nao dispara novo change
							e.target.value = "";
							void handleUpload(file);
						}
					}}
				/>
			</div>
			{error && <p className="text-destructive">{error}</p>}
		</PageShell>
	);
}
