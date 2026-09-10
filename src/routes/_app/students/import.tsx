import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ImportPreviewTable } from "#/components/students/import-preview-table";
import { Button } from "#/components/ui/button";
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

function ImportStudentsPage() {
	const navigate = useNavigate();
	const importPreview = useImportPreview();
	const resolveImport = useResolveImport();
	const [step, setStep] = useState(STEP_UPLOAD);
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
					initialResolutions[row.index] = {
						action: "link",
						existingStudentId: row.candidates?.[0]?.id,
					};
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
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Importação concluída</h1>
				<p>
					Criados: {result.created} | Vinculados: {result.linked} | Ignorados:{" "}
					{result.skipped}
				</p>
				<Button onClick={() => navigate({ to: "/students" })}>
					Ver estudantes
				</Button>
			</div>
		);
	}

	if (step === STEP_PREVIEW && preview) {
		const unresolvedConflicts = preview.rows.filter(
			(row) =>
				row.status === "conflict" && resolutions[row.index]?.action !== "link",
		);
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Revisar importação</h1>
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
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Importar estudantes</h1>
			<p className="text-sm text-muted-foreground">
				Envie um arquivo CSV ou planilha (.csv, .xlsx, .xls, .ods) com a coluna
				nome.
			</p>
			<input
				type="file"
				accept=".csv,.xlsx,.xls,.ods"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) void handleUpload(file);
				}}
			/>
			{error && <p className="text-destructive">{error}</p>}
		</div>
	);
}
