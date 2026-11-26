// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// zip.ts -- a minimal .zip writer: files stored as they are (no compression), so a folder of
// small text files (graphs as .json) can be downloaded as one file in browsers that can't
// write folders (Firefox, Safari). Every system's unzip opens it (Windows Explorer, macOS
// Archive Utility, unzip). No library needed for this little; compression isn't worth it for
// a few kilobytes of JSON.
// Format: PKWARE APPNOTE 6.3 -- local file header + data per file, then the central
// directory and its end record; UTF-8 names (flag bit 11); CRC-32 per file.
// Used by: $lib/graph/file-access.ts (save all as folder).
// -----------------------------------------------------------------------------------------

export interface ZipFile {
	path: string; // inside the zip, folders with "/", e.g. "imge-graphs-20261126/map.json"
	data: Uint8Array;
}

// CRC-32 (IEEE), the checksum zip stores for each file
const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c >>> 0;
	}
	return table;
})();

export function crc32(data: Uint8Array): number {
	let c = 0xffffffff;
	for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

/** Date and time in the DOS format zip stores (local time, 2-second steps, from 1980). */
function dosDateTime(date: Date): { time: number; day: number } {
	const year = Math.max(1980, date.getFullYear());
	return {
		time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
		day: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
	};
}

/** The .zip file's bytes for these files, each dated `date`. */
export function makeZip(files: ZipFile[], date: Date = new Date()): Uint8Array {
	const encoder = new TextEncoder();
	const { time, day } = dosDateTime(date);
	const parts: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;

	for (const file of files) {
		const name = encoder.encode(file.path);
		const crc = crc32(file.data);
		const size = file.data.length;

		// local file header (30 bytes + name)
		const local = new DataView(new ArrayBuffer(30));
		local.setUint32(0, 0x04034b50, true); // signature
		local.setUint16(4, 20, true); // version needed: 2.0
		local.setUint16(6, 0x0800, true); // flags: UTF-8 names
		local.setUint16(8, 0, true); // method: stored
		local.setUint16(10, time, true);
		local.setUint16(12, day, true);
		local.setUint32(14, crc, true);
		local.setUint32(18, size, true); // compressed size = size (stored)
		local.setUint32(22, size, true);
		local.setUint16(26, name.length, true);
		local.setUint16(28, 0, true); // extra field length
		parts.push(new Uint8Array(local.buffer), name, file.data);

		// its central directory record (46 bytes + name)
		const entry = new DataView(new ArrayBuffer(46));
		entry.setUint32(0, 0x02014b50, true);
		entry.setUint16(4, 20, true); // version made by
		entry.setUint16(6, 20, true); // version needed
		entry.setUint16(8, 0x0800, true);
		entry.setUint16(10, 0, true);
		entry.setUint16(12, time, true);
		entry.setUint16(14, day, true);
		entry.setUint32(16, crc, true);
		entry.setUint32(20, size, true);
		entry.setUint32(24, size, true);
		entry.setUint16(28, name.length, true);
		// 30 extra, 32 comment, 34 disk, 36 internal attributes: 0
		entry.setUint32(38, 0, true); // external attributes
		entry.setUint32(42, offset, true); // where its local header starts
		central.push(new Uint8Array(entry.buffer), name);

		offset += 30 + name.length + size;
	}

	const centralSize = central.reduce((n, p) => n + p.length, 0);
	const end = new DataView(new ArrayBuffer(22));
	end.setUint32(0, 0x06054b50, true);
	end.setUint16(8, files.length, true); // entries on this disk
	end.setUint16(10, files.length, true); // entries in all
	end.setUint32(12, centralSize, true);
	end.setUint32(16, offset, true); // where the central directory starts

	const all = [...parts, ...central, new Uint8Array(end.buffer)];
	const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
	let at = 0;
	for (const p of all) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}
