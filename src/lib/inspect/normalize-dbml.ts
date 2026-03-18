function normalizeTypeToken(rawType: string): string {
  if (rawType === "boolean") return "bool";
  if (rawType === "image") return "bubble_image";
  if (rawType === "file") return "bubble_file";
  if (rawType === "date_range") return "bubble_date_range";
  if (rawType === "varchar[]") return "string[]";

  const isArray = rawType.endsWith("[]");
  const coreType = isArray ? rawType.slice(0, -2) : rawType;

  if (coreType.startsWith("api.")) {
    if (/^api\.".*"$/.test(coreType)) return coreType;
    return `api."${coreType.slice(4)}"`;
  }

  if (coreType.startsWith("custom.")) {
    return `${coreType.slice(7)}.id`;
  }

  if (coreType.startsWith("option.")) {
    return `${coreType.slice(7)}.id`;
  }

  if (/^[A-Za-z0-9_]+\.id$/.test(coreType)) {
    return coreType;
  }

  return rawType;
}

interface ParsedFieldLine {
  leading: string;
  fieldToken: string;
  spacing: string;
  typeToken: string;
  suffix: string;
}

function parseFieldLine(line: string): ParsedFieldLine | null {
  const match = line.match(
    /^(\s*)((?:"[^"]+"|`[^`]+`|[^\s]+))(\s+)([^\s]+)(.*)$/,
  );
  if (!match) return null;

  return {
    leading: match[1],
    fieldToken: match[2],
    spacing: match[3],
    typeToken: match[4],
    suffix: match[5],
  };
}

function getFieldName(fieldToken: string): string {
  if (
    (fieldToken.startsWith('"') && fieldToken.endsWith('"')) ||
    (fieldToken.startsWith("`") && fieldToken.endsWith("`"))
  ) {
    return fieldToken.slice(1, -1);
  }
  return fieldToken;
}

function canonicalFieldName(fieldName: string): string {
  return fieldName
    .replace(/\s*-\s*deleted\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isDeletedField(fieldName: string): boolean {
  return /\bdeleted\b/i.test(fieldName);
}

function normalizeFieldLine(parsed: ParsedFieldLine): string {
  const normalizedType = normalizeTypeToken(parsed.typeToken);
  return `${parsed.leading}${parsed.fieldToken}${parsed.spacing}${normalizedType}${parsed.suffix}`;
}

export function normalizeDbmlForViewer(dbml: string): string {
  if (!dbml) return "";

  const lines = dbml.split("\n");
  const out: string[] = [];
  let inTableBlock = false;
  let tableFieldIndex = new Map<string, { outIndex: number; isDeleted: boolean }>();

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("Table ")) {
      inTableBlock = true;
      tableFieldIndex = new Map();
      out.push(line);
      continue;
    }

    if (inTableBlock && trimmed === "}") {
      inTableBlock = false;
      out.push(line);
      continue;
    }

    if (!inTableBlock || !trimmed || trimmed.startsWith("Note:")) {
      out.push(line);
      continue;
    }

    const parsed = parseFieldLine(line);
    if (!parsed) {
      out.push(line);
      continue;
    }

    const fieldName = getFieldName(parsed.fieldToken);
    const canonicalName = canonicalFieldName(fieldName);
    const deletedField = isDeletedField(fieldName);
    const normalizedLine = normalizeFieldLine(parsed);
    const existing = tableFieldIndex.get(canonicalName);

    if (!existing) {
      tableFieldIndex.set(canonicalName, {
        outIndex: out.length,
        isDeleted: deletedField,
      });
      out.push(normalizedLine);
      continue;
    }

    if (existing.isDeleted && !deletedField) {
      out[existing.outIndex] = normalizedLine;
      tableFieldIndex.set(canonicalName, {
        outIndex: existing.outIndex,
        isDeleted: false,
      });
    }
  }

  return out.join("\n");
}
