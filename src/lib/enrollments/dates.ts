const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: unknown): value is string {
	if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
		return false;
	}
	const [year, month, day] = value.split("-").map(Number);
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		return false;
	}
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

export function dateStringToTimestamp(dateString: string): number {
	const [year, month, day] = dateString.split("-").map(Number);
	return Date.UTC(year, month - 1, day);
}

export function timestampToDateString(timestamp: number): string {
	const date = new Date(timestamp);
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

const DAY_IN_MS = 86_400_000;

export function previousDay(timestamp: number): number {
	return timestamp - DAY_IN_MS;
}
