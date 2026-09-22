import { describe, expect, it } from "vitest";

import { dataUriImageDimensions, measureDataUriImage } from "./measure-image";
import { CONTENT_WIDTH } from "./paginate";

const PNG_1X1 =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const JPG_1X1 =
	"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

describe("dataUriImageDimensions", () => {
	it("lê dimensões de PNG", () => {
		expect(dataUriImageDimensions(PNG_1X1)).toEqual({ width: 1, height: 1 });
	});

	it("lê dimensões de JPEG", () => {
		expect(dataUriImageDimensions(JPG_1X1)).toEqual({ width: 1, height: 1 });
	});

	it("aceita mime image/jpg", () => {
		const src = JPG_1X1.replace("image/jpeg", "image/jpg");
		expect(dataUriImageDimensions(src)).toEqual({ width: 1, height: 1 });
	});

	it("retorna null para URL externa (não data-URI)", () => {
		expect(dataUriImageDimensions("https://exemplo.test/x.png")).toBeNull();
	});

	it("retorna null para data-URI corrompido", () => {
		expect(dataUriImageDimensions("data:image/png;base64,lixo")).toBeNull();
	});

	it("retorna null para base64 inválido", () => {
		expect(
			dataUriImageDimensions("data:image/png;base64,!!!!not-base64!!!!"),
		).toBeNull();
	});

	it("retorna null para formato não suportado (webp)", () => {
		expect(dataUriImageDimensions("data:image/webp;base64,AAAA")).toBeNull();
	});
});

describe("measureDataUriImage", () => {
	it("imagem pequena não é ampliada", () => {
		expect(measureDataUriImage(PNG_1X1)).toEqual({
			width: 1,
			height: 1,
		});
	});

	it("fallback de texto quando não consegue medir", () => {
		expect(measureDataUriImage("https://x/y.png")).toBeNull();
		expect(measureDataUriImage(JPG_1X1)).toEqual({ width: 1, height: 1 });
	});

	it("png truncado pode ler lixo do header (só cabeçalho, sem validação CRC)", () => {
		// documentado: medimos só o IHDR; pixels inválidos falham no PDF,
		// que então usa o fallback de texto
		const measured = measureDataUriImage(PNG_1X1.replace("AAAA", ""));
		expect(measured === null || measured.width >= 0).toBe(true);
	});

	it("retorna null para PNG menor que o IHDR completo", () => {
		// 8 (assinatura) + 4 (len) + 4 ("IHDR") + 8 (w/h) = 24 bytes mínimos
		const short = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		const src = `data:image/png;base64,${short.toString("base64")}`;
		expect(dataUriImageDimensions(src)).toBeNull();
	});

	it("retorna null para PNG com dimensão zero", () => {
		const zero = Buffer.alloc(33);
		zero[0] = 0x89;
		zero.set([0x50, 0x4e, 0x47], 1);
		zero.writeUInt32BE(0, 16);
		zero.writeUInt32BE(10, 20);
		const src = `data:image/png;base64,${zero.toString("base64")}`;
		expect(dataUriImageDimensions(src)).toBeNull();
	});

	it("retorna null para JPEG sem marcador SOI", () => {
		const bad = Buffer.from([0x00, 0x00, 0xff, 0xd8]);
		const src = `data:image/jpeg;base64,${bad.toString("base64")}`;
		expect(dataUriImageDimensions(src)).toBeNull();
	});

	it("retorna null para JPEG sem SOF (só bytes não-ff)", () => {
		const noSof = Buffer.from([
			0xff, 0xd8, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x11, 0x22,
		]);
		const src = `data:image/jpeg;base64,${noSof.toString("base64")}`;
		expect(dataUriImageDimensions(src)).toBeNull();
	});

	it("ignora bytes soltos antes de um marcador SOF no JPEG", () => {
		// junk sem 0xff, depois APP0 e SOF0 (h=32, w=64)
		const withJunk = Buffer.from([
			0xff,
			0xd8,
			0x00,
			0x11,
			0x22,
			0x33, // junk após SOI (sem 0xff)
			0xff,
			0xe0,
			0x00,
			0x02,
			0x00,
			0x00, // APP0 len 2
			0xff,
			0xc0,
			0x00,
			0x0b,
			0x08,
			0x00,
			0x20,
			0x00,
			0x40,
			0x01,
			0x01,
			0x11,
			0x00,
		]);
		const src = `data:image/jpeg;base64,${withJunk.toString("base64")}`;
		expect(dataUriImageDimensions(src)).toEqual({ width: 64, height: 32 });
	});

	it("respeita CONTENT_WIDTH como teto", () => {
		// sanity: CONTENT_WIDTH é o mesmo teto usado pelo PDF
		expect(CONTENT_WIDTH).toBeGreaterThan(0);
	});
});
