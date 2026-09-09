export function normalizeName(input: string) {
	return input
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\s+/g, " ");
}

export function normalizeDocument(input: string) {
	return input.replace(/\D/g, "");
}
