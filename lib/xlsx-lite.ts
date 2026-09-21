// @ts-nocheck
// Browser-only minimal XLSX reader/writer. Type checking is intentionally disabled here
// because CompressionStream/DecompressionStream DOM typings differ by TypeScript version.
export type XlsxSheet = { name: string; rows: Array<Array<string | number | boolean | null | undefined>> };
export type ParsedXlsx = Record<string, string[][]>;

const te = new TextEncoder();
const td = new TextDecoder();

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function columnIndex(ref: string) {
  const letters = ref.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
  return Math.max(0, n - 1);
}

function u16(value: number) {
  const a = new Uint8Array(2);
  new DataView(a.buffer).setUint16(0, value, true);
  return a;
}
function u32(value: number) {
  const a = new Uint8Array(4);
  new DataView(a.buffer).setUint32(0, value >>> 0, true);
  return a;
}
function concat(parts: Uint8Array[]) {
  const size = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (const b of data) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function deflateRaw(data: Uint8Array) {
  if (typeof CompressionStream === "undefined") throw new Error("이 브라우저는 Excel 파일 생성을 지원하지 않습니다. 최신 Chrome/Edge에서 이용해 주세요.");
  const stream = new CompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  await writer.write(data);
  await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function inflateRaw(data: Uint8Array) {
  if (typeof DecompressionStream === "undefined") throw new Error("이 브라우저는 Excel 파일 읽기를 지원하지 않습니다. 최신 Chrome/Edge에서 이용해 주세요.");
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  await writer.write(data);
  await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function makeZip(files: Array<{ name: string; data: Uint8Array }>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = te.encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data,
    ]);
    localParts.push(local);
    centralParts.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += local.length;
  }
  const central = concat(centralParts);
  const eocd = concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(offset), u16(0),
  ]);
  return concat([...localParts, central, eocd]);
}

function worksheetXml(rows: XlsxSheet["rows"]) {
  const maxCols = Math.max(1, ...rows.map(r => r.length));
  const rowXml = rows.map((row, ri) => {
    const cells = row.map((value, ci) => {
      if (value === null || value === undefined || value === "") return "";
      const ref = `${columnName(ci)}${ri + 1}`;
      const style = ri === 0 ? ' s="1"' : "";
      return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }).join("");
    return `<row r="${ri + 1}">${cells}</row>`;
  }).join("");
  const widths = Array.from({ length: maxCols }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${i === 0 ? 22 : 18}" customWidth="1"/>`).join("");
  const dim = `A1:${columnName(maxCols - 1)}${Math.max(1, rows.length)}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${dim}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${widths}</cols><sheetData>${rowXml}</sheetData>${rows.length ? `<autoFilter ref="A1:${columnName(maxCols - 1)}1"/>` : ""}</worksheet>`;
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF166534"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export async function createXlsxBlob(sheets: XlsxSheet[]) {
  if (!sheets.length) throw new Error("Excel 시트가 없습니다.");
  const sheetOverrides = sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetOverrides}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  const workbookSheets = sheets.map((s, i) => `<sheet name="${xmlEscape(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const now = new Date().toISOString();
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>숲 법무사 사무소</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>숲 법무사 홈페이지</Application></Properties>`;
  const files = [
    { name: "[Content_Types].xml", data: te.encode(contentTypes) },
    { name: "_rels/.rels", data: te.encode(rootRels) },
    { name: "xl/workbook.xml", data: te.encode(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: te.encode(workbookRels) },
    { name: "xl/styles.xml", data: te.encode(stylesXml) },
    { name: "docProps/core.xml", data: te.encode(core) },
    { name: "docProps/app.xml", data: te.encode(app) },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: te.encode(worksheetXml(s.rows)) })),
  ];
  return new Blob([await makeZip(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

async function unzip(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("올바른 XLSX 파일이 아닙니다.");
  const entries = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  for (let i = 0; i < entries; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) throw new Error("Excel ZIP 구조를 읽지 못했습니다.");
    const method = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const name = td.decode(bytes.slice(ptr + 46, ptr + 46 + nameLen));
    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("Excel 파일 항목을 읽지 못했습니다.");
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = bytes.slice(start, start + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (!data) throw new Error(`지원하지 않는 XLSX 압축 방식입니다 (${method}).`);
    out.set(name, data);
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function parseXml(data: Uint8Array | undefined, name: string) {
  if (!data) throw new Error(`XLSX 구성파일이 없습니다: ${name}`);
  const doc = new DOMParser().parseFromString(td.decode(data), "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error(`XLSX XML을 읽지 못했습니다: ${name}`);
  return doc;
}

function excelDate(serial: number) {
  const ms = Date.UTC(1899, 11, 30) + Math.round(serial * 86400000);
  return new Date(ms).toISOString().slice(0, 10);
}

function buildDateStyles(stylesDoc?: Document) {
  if (!stylesDoc) return new Set<number>();
  const custom = new Map<number, string>();
  for (const node of Array.from(stylesDoc.getElementsByTagName("numFmt"))) custom.set(Number(node.getAttribute("numFmtId")), node.getAttribute("formatCode") ?? "");
  const result = new Set<number>();
  const xfsParent = stylesDoc.getElementsByTagName("cellXfs")[0];
  if (!xfsParent) return result;
  const xfs = Array.from(xfsParent.getElementsByTagName("xf"));
  xfs.forEach((xf, index) => {
    const id = Number(xf.getAttribute("numFmtId") ?? 0);
    const code = (custom.get(id) ?? "").replace(/\[[^\]]*\]|"[^\"]*"/g, "").toLowerCase();
    if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47) || /[ymd]/.test(code)) result.add(index);
  });
  return result;
}

export async function parseXlsxFile(file: File): Promise<ParsedXlsx> {
  const zip = await unzip(await file.arrayBuffer());
  const workbook = parseXml(zip.get("xl/workbook.xml"), "workbook.xml");
  const rels = parseXml(zip.get("xl/_rels/workbook.xml.rels"), "workbook.xml.rels");
  const relMap = new Map<string, string>();
  for (const rel of Array.from(rels.getElementsByTagName("Relationship"))) relMap.set(rel.getAttribute("Id") ?? "", rel.getAttribute("Target") ?? "");
  const shared: string[] = [];
  const sharedData = zip.get("xl/sharedStrings.xml");
  if (sharedData) {
    const sharedDoc = parseXml(sharedData, "sharedStrings.xml");
    for (const si of Array.from(sharedDoc.getElementsByTagName("si"))) shared.push(Array.from(si.getElementsByTagName("t")).map(t => t.textContent ?? "").join(""));
  }
  const stylesDoc = zip.get("xl/styles.xml") ? parseXml(zip.get("xl/styles.xml"), "styles.xml") : undefined;
  const dateStyles = buildDateStyles(stylesDoc);
  const result: ParsedXlsx = {};
  for (const sheet of Array.from(workbook.getElementsByTagName("sheet"))) {
    const name = sheet.getAttribute("name") ?? "Sheet";
    const rid = sheet.getAttribute("r:id") ?? sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? "";
    const target = relMap.get(rid);
    if (!target) continue;
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
    const doc = parseXml(zip.get(path), path);
    const rows: string[][] = [];
    for (const row of Array.from(doc.getElementsByTagName("row"))) {
      const out: string[] = [];
      for (const cell of Array.from(row.getElementsByTagName("c"))) {
        const ref = cell.getAttribute("r") ?? "A1";
        const ci = columnIndex(ref);
        const type = cell.getAttribute("t") ?? "n";
        const styleIndex = Number(cell.getAttribute("s") ?? 0);
        let value = "";
        if (type === "inlineStr") value = Array.from(cell.getElementsByTagName("t")).map(t => t.textContent ?? "").join("");
        else {
          const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
          if (type === "s") value = shared[Number(raw)] ?? "";
          else if (type === "b") value = raw === "1" ? "TRUE" : "FALSE";
          else if (type === "str") value = raw;
          else if (raw && dateStyles.has(styleIndex) && Number.isFinite(Number(raw))) value = excelDate(Number(raw));
          else value = raw;
        }
        while (out.length < ci) out.push("");
        out[ci] = value;
      }
      rows.push(out);
    }
    result[name] = rows;
  }
  return result;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
