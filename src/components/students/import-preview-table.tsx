import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";

type PreviewRow = {
	index: number;
	name: string;
	document: string;
	status: "valid" | "conflict" | "invalid";
	existingStudentId?: string;
	existingStudentName?: string;
	errors: string[];
	candidates?: Array<{ id: string; name: string; reason: string }>;
};

export function ImportPreviewTable({
	rows,
	resolutions,
	onChangeResolution,
}: {
	rows: PreviewRow[];
	resolutions: Record<
		number,
		{ action: "create" | "link" | "skip"; existingStudentId?: string }
	>;
	onChangeResolution: (
		index: number,
		resolution: {
			action: "create" | "link" | "skip";
			existingStudentId?: string;
		},
	) => void;
}) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Linha</TableHead>
					<TableHead>Nome</TableHead>
					<TableHead>Documento</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Ação</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => (
					<TableRow key={row.index}>
						<TableCell>{row.index}</TableCell>
						<TableCell>{row.name || "-"}</TableCell>
						<TableCell>{row.document}</TableCell>
						<TableCell>{statusLabel(row.status)}</TableCell>
						<TableCell>
							<ConflictResolver
								row={row}
								resolution={resolutions[row.index]}
								onChange={(resolution) =>
									onChangeResolution(row.index, resolution)
								}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function statusLabel(status: PreviewRow["status"]) {
	switch (status) {
		case "valid":
			return "Válido";
		case "conflict":
			return "Conflito";
		case "invalid":
			return "Inválido";
	}
}

function ConflictResolver({
	row,
	resolution,
	onChange,
}: {
	row: PreviewRow;
	resolution?: {
		action: "create" | "link" | "skip";
		existingStudentId?: string;
	};
	onChange: (resolution: {
		action: "create" | "link" | "skip";
		existingStudentId?: string;
	}) => void;
}) {
	if (row.status === "invalid") {
		return (
			<span className="text-sm text-destructive">{row.errors.join(", ")}</span>
		);
	}

	const action =
		resolution?.action ?? (row.status === "conflict" ? undefined : "create");

	return (
		<div className="flex flex-col gap-2">
			<select
				value={action ?? ""}
				onChange={(e) => {
					const value = e.target.value as "create" | "link" | "skip";
					onChange({ action: value });
				}}
				className="rounded border px-2 py-1"
				aria-label="Ação de importação"
			>
				<option value="create" disabled={row.status === "conflict"}>
					Criar novo
				</option>
				<option value="link" disabled={row.status !== "conflict"}>
					Vincular existente
				</option>
				<option value="skip">Ignorar</option>
			</select>
			{action === "link" && row.candidates && (
				<select
					value={resolution?.existingStudentId ?? row.candidates[0]?.id}
					onChange={(e) =>
						onChange({ action: "link", existingStudentId: e.target.value })
					}
					className="rounded border px-2 py-1"
					aria-label="Estudante existente"
				>
					{row.candidates.map((candidate) => (
						<option key={candidate.id} value={candidate.id}>
							{candidate.name} ({reasonLabel(candidate.reason)})
						</option>
					))}
				</select>
			)}
		</div>
	);
}

function reasonLabel(reason: string) {
	return reason === "document" ? "documento" : "nome";
}
