const MAX_IMAGE_SIZE = 1024 * 1024; // 1 MB
const ALLOWED_TYPES = [
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/webp",
	"image/gif",
];

export function isAllowedImageType(file: File): boolean {
	return ALLOWED_TYPES.includes(file.type);
}

export function readFileAsBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			resolve(result);
		};
		reader.onerror = () =>
			reject(reader.error ?? new Error("Erro ao ler imagem"));
		reader.readAsDataURL(file);
	});
}

export async function imageFileToInlineBase64(
	file: File,
	options: { maxSize?: number } = {},
): Promise<{ src: string; alt: string; error?: string }> {
	const maxSize = options.maxSize ?? MAX_IMAGE_SIZE;
	if (!isAllowedImageType(file)) {
		return {
			src: "",
			alt: file.name,
			error: "Formato não suportado. Use PNG, JPEG, WebP ou GIF.",
		};
	}
	if (file.size > maxSize) {
		return {
			src: "",
			alt: file.name,
			error: `Imagem muito grande. Limite: ${(maxSize / 1024 / 1024).toFixed(1)} MB.`,
		};
	}
	const src = await readFileAsBase64(file);
	return { src, alt: file.name };
}

/** Extrai MIME type e bytes de uma data URL. */
export function parseDataUrl(
	dataUrl: string,
): { mime: string; base64: string } | null {
	const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
	if (!match) {
		return null;
	}
	return { mime: match[1], base64: match[2] };
}
