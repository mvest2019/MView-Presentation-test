/*
 * A zip file, built in the browser.
 *
 * An .xlsx is a zip of XML parts, and this is the smallest thing that writes
 * one: entries are stored rather than deflated, so there is no compressor
 * here — a few hundred kilobytes of spreadsheet XML is not worth pulling a
 * dependency in for, and Excel reads stored entries exactly as happily.
 */

/** The polynomial table, built once on first use rather than at import. */
let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      crcTable[index] = value >>> 0;
    }
  }

  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** One file in the archive: a path, and its bytes. */
export type ZipEntry = { path: string; bytes: Uint8Array<ArrayBuffer> };

/** The date every entry is stamped with, in DOS's two packed shorts. */
function dosStamp(when: Date): { time: number; date: number } {
  return {
    time:
      (when.getHours() << 11) |
      (when.getMinutes() << 5) |
      (Math.floor(when.getSeconds() / 2) & 0x1f),
    date:
      ((when.getFullYear() - 1980) << 9) |
      ((when.getMonth() + 1) << 5) |
      when.getDate(),
  };
}

/**
 * Packs the entries into a zip archive.
 *
 * Local headers, then the central directory, then the end record — the layout
 * every reader expects, with no data descriptors, since the sizes are all
 * known before anything is written.
 */
export function zip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const stamp = dosStamp(new Date());

  const locals: Uint8Array<ArrayBuffer>[] = [];
  const central: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const crc = crc32(entry.bytes);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0, true); // flags
    local.setUint16(8, 0, true); // stored, not deflated
    local.setUint16(10, stamp.time, true);
    local.setUint16(12, stamp.date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, entry.bytes.length, true);
    local.setUint32(22, entry.bytes.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true); // no extra field

    locals.push(new Uint8Array(local.buffer), name, entry.bytes);

    const record = new DataView(new ArrayBuffer(46));
    record.setUint32(0, 0x02014b50, true);
    record.setUint16(4, 20, true); // version made by
    record.setUint16(6, 20, true); // version needed
    record.setUint16(8, 0, true);
    record.setUint16(10, 0, true);
    record.setUint16(12, stamp.time, true);
    record.setUint16(14, stamp.date, true);
    record.setUint32(16, crc, true);
    record.setUint32(20, entry.bytes.length, true);
    record.setUint32(24, entry.bytes.length, true);
    record.setUint16(28, name.length, true);
    record.setUint16(30, 0, true); // extra
    record.setUint16(32, 0, true); // comment
    record.setUint16(34, 0, true); // disk
    record.setUint16(36, 0, true); // internal attributes
    record.setUint32(38, 0, true); // external attributes
    record.setUint32(42, offset, true);

    central.push(new Uint8Array(record.buffer), name);
    offset += 30 + name.length + entry.bytes.length;
  }

  const centralSize = central.reduce((total, part) => total + part.length, 0);

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(4, 0, true); // this disk
  end.setUint16(6, 0, true); // disk with the directory
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  end.setUint16(20, 0, true); // no comment

  return new Blob([...locals, ...central, new Uint8Array(end.buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
