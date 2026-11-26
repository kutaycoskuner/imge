// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// zip.spec.ts -- checks the .zip writer: the CRC-32 against its standard check value, and
// that a written archive reads back (end record, central directory, local headers, the
// files' names and bytes, UTF-8 names).
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { crc32, makeZip } from './zip';

const text = (s: string) => new TextEncoder().encode(s);

/** Reads the files back out of an archive written by makeZip (stored entries only). */
function readZip(zip: Uint8Array): { path: string; data: string; crc: number }[] {
	const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
	const end = zip.length - 22;
	expect(view.getUint32(end, true)).toBe(0x06054b50);
	const count = view.getUint16(end + 10, true);
	let at = view.getUint32(end + 16, true); // central directory
	const out = [];
	for (let i = 0; i < count; i++) {
		expect(view.getUint32(at, true)).toBe(0x02014b50);
		const crc = view.getUint32(at + 16, true);
		const nameLength = view.getUint16(at + 28, true);
		const localAt = view.getUint32(at + 42, true);
		const path = new TextDecoder().decode(zip.subarray(at + 46, at + 46 + nameLength));
		expect(view.getUint32(localAt, true)).toBe(0x04034b50);
		const size = view.getUint32(localAt + 18, true);
		const dataAt = localAt + 30 + view.getUint16(localAt + 26, true);
		out.push({ path, crc, data: new TextDecoder().decode(zip.subarray(dataAt, dataAt + size)) });
		at += 46 + nameLength;
	}
	return out;
}

describe('zip', () => {
	it('computes the standard CRC-32 check value', () => {
		expect(crc32(text('123456789'))).toBe(0xcbf43926);
		expect(crc32(new Uint8Array())).toBe(0);
	});

	it('writes files that read back with their names, bytes and checksums', () => {
		const files = [
			{ path: 'imge-graphs-20261126/map.json', data: text('{"a":1}\n') },
			{ path: 'imge-graphs-20261126/çizge ğ.json', data: text('{"b":"ş"}\n') }
		];
		const back = readZip(makeZip(files, new Date(2026, 10, 26, 12, 0, 0)));
		expect(back.map((f) => f.path)).toEqual(files.map((f) => f.path));
		expect(back.map((f) => f.data)).toEqual(['{"a":1}\n', '{"b":"ş"}\n']);
		expect(back[0].crc).toBe(crc32(files[0].data));
	});

	it('writes an empty archive as just the end record', () => {
		expect(makeZip([]).length).toBe(22);
	});
});
