import { useState } from "react";

import { EditClassDialog } from "#/components/classes/edit-class-dialog";
import { Button } from "#/components/ui/button";
import type { ClassListItem } from "#/lib/classes/types";

export function ClassRowActions({ classRow }: { classRow: ClassListItem }) {
	const [open, setOpen] = useState(false);

	return (
		<div className="flex items-center justify-end">
			<EditClassDialog
				classRow={classRow}
				open={open}
				onOpenChange={setOpen}
				trigger={
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setOpen(true)}
						aria-label={`Editar ${classRow.name}`}
					>
						Editar
					</Button>
				}
			/>
		</div>
	);
}
