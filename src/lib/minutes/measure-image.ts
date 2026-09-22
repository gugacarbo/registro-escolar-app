import { CONTENT_WIDTH } from "./paginate";

// Medição de dimensões de imagens data-URI (png/jpeg) direto do header —
// síncrono e headless, para escalar a imagem no preview igual ao PDF.
// (O PDF usa os embedders do pdf-lib, que decodificam pixels; aqui basta o
// IHDR do PNG e o marcador SOF do JPEG.)

export type ImageDimensions = { width: number; height: number };

/** Dimensões declaradas no IHDR de um PNG. */
function pngDimensions(bytes: Uint8Array): ImageDimensions | null {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	// assinatura (8) + tamanho IHDR (4) + "IHDR" (4) → width em 16, height em 20
	if (bytes.byteLength < 24) return null;
	const isPng =
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47;
	if (!isPng) return null;
	const width = view.getUint32(16);
	const height = view.getUint32(20);
	if (width === 0 || height === 0) return null;
	return { width, height };
}

/** Dimensões declaradas no primeiro marcador SOF de um JPEG. */
function jpegDimensions(bytes: Uint8Array): ImageDimensions | null {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
		return null;
	}
	let offset = 2;
	while (offset + 9 < bytes.byteLength) {
		if (bytes[offset] !== 0xff) {
			offset += 1;
			continue;
		}
		const marker = bytes[offset + 1];
		const isStartOfFrame =
			marker >= 0xc0 &&
			marker <= 0xcf &&
			marker !== 0xc4 &&
			marker !== 0xc8 &&
			marker !== 0xcc;
		if (isStartOfFrame) {
			const height = view.getUint16(offset + 5);
			const width = view.getUint16(offset + 7);
			if (width === 0 || height === 0) return null;
			return { width, height };
		}
		offset += 2 + view.getUint16(offset + 2);
	}
	return null;
}

/**
 * Dimensões (px) de uma imagem data-URI PNG ou JPEG; null quando o formato
 * não é suportado ou o header é inválido (o preview usa fallback de texto,
 * como o fallback do PDF para imagens quebradas).
 */
export function dataUriImageDimensions(src: string): ImageDimensions | null {
	const match = src.match(/^data:image\/(\w+);base64,(.+)$/);
	if (!match) return null;
	const [, mime, base64] = match;
	let bytes: Uint8Array;
	try {
		bytes = new Uint8Array(
			atob(base64)
				.split("")
				.map((ch) => ch.charCodeAt(0)),
		);
	} catch {
		return null;
	}
	if (mime === "png") {
		return pngDimensions(bytes);
	}
	if (mime === "jpeg" || mime === "jpg") {
		return jpegDimensions(bytes);
	}
	return null;
}

/** Escala px → pt na largura de conteúdo, como o PDF (fitImage). */
export function measureDataUriImage(src: string) {
	const dims = dataUriImageDimensions(src);
	if (!dims) return null;
	const scale = Math.min(1, CONTENT_WIDTH / dims.width);
	return {
		width: dims.width * scale,
		height: dims.height * scale,
	};
}
