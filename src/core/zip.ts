/**
 * Minimal ZIP writer (STORE method — uncompressed, no DEFLATE) built by
 * hand per the PKZIP spec. No jszip/fflate dependency. STORE is a fully
 * valid, spec-compliant compression method (0); Word/Excel/PowerPoint all
 * open uncompressed .docx/.xlsx/.pptx files without complaint. This keeps
 * the implementation simple and dependency-free at the cost of file size.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date: Date): { time: number; dosDate: number } {
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() >> 1) & 0x1f)
  const dosDate = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f)
  return { time, dosDate }
}

interface ZipEntry {
  name: string
  data: Uint8Array
  crc: number
  offset: number
}

export class ZipWriter {
  private entries: ZipEntry[] = []
  private chunks: Uint8Array[] = []
  private offset = 0
  private readonly stamp = dosDateTime(new Date())

  addFile(name: string, content: string | Uint8Array): void {
    const data = typeof content === "string" ? new TextEncoder().encode(content) : content
    const crc = crc32(data)
    const nameBytes = new TextEncoder().encode(name)

    const header = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(header.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0, true)
    view.setUint16(8, 0, true) // method 0 = store
    view.setUint16(10, this.stamp.time, true)
    view.setUint16(12, this.stamp.dosDate, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, data.length, true)
    view.setUint32(22, data.length, true)
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true)
    header.set(nameBytes, 30)

    this.entries.push({ name, data, crc, offset: this.offset })
    this.chunks.push(header, data)
    this.offset += header.length + data.length
  }

  async toBlob(): Promise<Blob> {
    const centralChunks: Uint8Array[] = []
    let centralSize = 0
    const centralStart = this.offset

    for (const entry of this.entries) {
      const nameBytes = new TextEncoder().encode(entry.name)
      const record = new Uint8Array(46 + nameBytes.length)
      const view = new DataView(record.buffer)
      view.setUint32(0, 0x02014b50, true)
      view.setUint16(4, 20, true)
      view.setUint16(6, 20, true)
      view.setUint16(8, 0, true)
      view.setUint16(10, 0, true)
      view.setUint16(12, this.stamp.time, true)
      view.setUint16(14, this.stamp.dosDate, true)
      view.setUint32(16, entry.crc, true)
      view.setUint32(20, entry.data.length, true)
      view.setUint32(24, entry.data.length, true)
      view.setUint16(28, nameBytes.length, true)
      view.setUint16(30, 0, true)
      view.setUint16(32, 0, true)
      view.setUint16(34, 0, true)
      view.setUint16(36, 0, true)
      view.setUint32(38, 0, true)
      view.setUint32(42, entry.offset, true)
      record.set(nameBytes, 46)
      centralChunks.push(record)
      centralSize += record.length
    }

    const end = new Uint8Array(22)
    const endView = new DataView(end.buffer)
    endView.setUint32(0, 0x06054b50, true)
    endView.setUint16(4, 0, true)
    endView.setUint16(6, 0, true)
    endView.setUint16(8, this.entries.length, true)
    endView.setUint16(10, this.entries.length, true)
    endView.setUint32(12, centralSize, true)
    endView.setUint32(16, centralStart, true)
    endView.setUint16(20, 0, true)

    return new Blob([...this.chunks, ...centralChunks, end] as BlobPart[], { type: "application/zip" })
  }
}
