export type DbmlMode = "strict" | "forensic";

export interface BubbleFieldInput {
  key: string;
  displayName: string;
  rawType: string;
  isList: boolean;
  baseType: string;
  dbType: string;
}

export interface BubbleTypeInput {
  key: string;
  name: string;
  fields: BubbleFieldInput[];
}

export interface BubbleOptionSetInput {
  key: string;
  name: string;
  attributes: BubbleFieldInput[];
}

export interface BubbleSchemaInput {
  database: {
    types?: BubbleTypeInput[];
  };
  optionSets?: {
    items?: BubbleOptionSetInput[];
  };
}

type TableSchema = "custom" | "option";
type FieldKind = "customRef" | "userRef" | "optionType" | "primitive";

interface CanonicalField {
  sourceKey: string;
  displayName: string;
  normalizedDisplayName: string;
  emittedName: string;
  isDeleted: boolean;
  isList: boolean;
  kind: FieldKind;
  targetSchema?: TableSchema;
  targetKey?: string;
  typeToken: string;
  priority: number;
}

interface CanonicalTable {
  schema: TableSchema;
  key: string;
  name: string;
  fields: CanonicalField[];
}

export interface CanonicalSchema {
  tables: CanonicalTable[];
  mode: DbmlMode;
}

export interface DbmlColumn {
  name: string;
  type: string;
  note?: string;
}

export interface DbmlTable {
  schema: TableSchema;
  key: string;
  displayName: string;
  columns: DbmlColumn[];
}

export interface DbmlRef {
  fromSchema: TableSchema;
  fromTable: string;
  fromColumn: string;
  toSchema: TableSchema;
  toTable: string;
  toColumn: string;
  isList: boolean;
}

export interface DbmlModel {
  tables: DbmlTable[];
  refs: DbmlRef[];
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isDeletedToken(value: string): boolean {
  return /\bdeleted\b/i.test(value);
}

function canonicalDisplayName(value: string): string {
  return normalizeWhitespace(value)
    .replace(/\s*-\s*deleted\b/gi, "")
    .trim()
    .toLowerCase();
}

function normalizePrimitiveType(baseType: string, dbType: string, isList: boolean): string {
  if (baseType === "boolean") return "bool";
  if (baseType === "image") return "bubble_image";
  if (baseType === "file") return "bubble_file";
  if (baseType === "date_range" || dbType === "date_range") return "bubble_date_range";

  if (isList && (baseType === "text" || dbType === "varchar[]")) return "string[]";
  if (isList && baseType === "number") return "float[]";
  if (isList && baseType === "date") return "datetime[]";
  if (isList && baseType === "boolean") return "bool[]";

  if (dbType === "varchar[]") return "string[]";
  if (dbType === "varchar") return "varchar";
  if (dbType === "float") return "float";
  if (dbType === "datetime") return "datetime";
  if (dbType === "bool" || dbType === "boolean") return "bool";
  if (dbType === "file") return "bubble_file";
  if (dbType === "image") return "bubble_image";
  if (dbType === "number_range") return "bubble_number_range";

  if (baseType === "text") return isList ? "string[]" : "varchar";
  if (baseType === "number") return isList ? "float[]" : "float";
  if (baseType === "date") return isList ? "datetime[]" : "datetime";

  return isList ? "string[]" : "varchar";
}

function parseRelationTarget(baseType: string, rawType: string): { kind: FieldKind; targetKey?: string } {
  const source = baseType || rawType;
  const custom = source.match(/^custom\.([a-zA-Z0-9_]+)(?:\[\])?$/);
  if (custom) return { kind: "customRef", targetKey: custom[1] };

  if (source === "user" || source === "user[]") return { kind: "userRef", targetKey: "user" };

  const option = source.match(/^option\.([a-zA-Z0-9_]+)(?:\[\])?$/);
  if (option) return { kind: "optionType", targetKey: option[1] };

  const rawListCustom = rawType.match(/^list\.custom\.([a-zA-Z0-9_]+)$/);
  if (rawListCustom) return { kind: "customRef", targetKey: rawListCustom[1] };

  const rawListUser = rawType.match(/^list\.user$/);
  if (rawListUser) return { kind: "userRef", targetKey: "user" };

  const rawListOption = rawType.match(/^list\.option\.([a-zA-Z0-9_]+)$/);
  if (rawListOption) return { kind: "optionType", targetKey: rawListOption[1] };

  return { kind: "primitive" };
}

function buildCanonicalField(
  field: BubbleFieldInput,
  mode: DbmlMode,
  fallbackName: string,
): CanonicalField | null {
  const displayName = normalizeWhitespace(field.displayName || fallbackName || field.key || "field");
  const normalizedName = canonicalDisplayName(displayName || field.key);
  const deleted = isDeletedToken(displayName) || isDeletedToken(field.key || "");

  if (mode === "strict" && deleted) return null;

  const relation = parseRelationTarget(field.baseType ?? "", field.rawType ?? "");
  const isList = Boolean(field.isList) || /^list\./.test(field.rawType ?? "");

  if (relation.kind === "customRef") {
    return {
      sourceKey: field.key,
      displayName,
      normalizedDisplayName: normalizedName,
      emittedName: displayName,
      isDeleted: deleted,
      isList,
      kind: "customRef",
      targetSchema: "custom",
      targetKey: relation.targetKey,
      typeToken: relation.targetKey ? `${relation.targetKey}.id${isList ? "[]" : ""}` : "varchar",
      priority: 3,
    };
  }

  if (relation.kind === "userRef") {
    return {
      sourceKey: field.key,
      displayName,
      normalizedDisplayName: normalizedName,
      emittedName: displayName,
      isDeleted: deleted,
      isList,
      kind: "userRef",
      targetSchema: "custom",
      targetKey: "user",
      typeToken: `user.id${isList ? "[]" : ""}`,
      priority: 3,
    };
  }

  if (relation.kind === "optionType") {
    return {
      sourceKey: field.key,
      displayName,
      normalizedDisplayName: normalizedName,
      emittedName: displayName,
      isDeleted: deleted,
      isList,
      kind: "optionType",
      targetSchema: "option",
      targetKey: relation.targetKey,
      typeToken: relation.targetKey ? `${relation.targetKey}.id${isList ? "[]" : ""}` : "varchar",
      priority: 2,
    };
  }

  return {
    sourceKey: field.key,
    displayName,
    normalizedDisplayName: normalizedName,
    emittedName: displayName,
    isDeleted: deleted,
    isList,
    kind: "primitive",
    typeToken: normalizePrimitiveType(field.baseType ?? "", field.dbType ?? "", isList),
    priority: 1,
  };
}

function dedupeFields(fields: CanonicalField[], mode: DbmlMode): CanonicalField[] {
  const grouped = new Map<string, CanonicalField[]>();
  for (const field of fields) {
    const key = field.normalizedDisplayName || field.sourceKey.toLowerCase();
    const list = grouped.get(key) ?? [];
    list.push(field);
    grouped.set(key, list);
  }

  const deduped: CanonicalField[] = [];

  for (const [, group] of grouped) {
    if (group.length === 1) {
      deduped.push(group[0]);
      continue;
    }

    if (mode === "forensic") {
      const ordered = [...group].sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
      ordered.forEach((field, idx) => {
        deduped.push({
          ...field,
          emittedName: idx === 0 ? field.emittedName : `${field.emittedName} [${field.sourceKey}]`,
        });
      });
      continue;
    }

    const sorted = [...group].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.sourceKey.localeCompare(b.sourceKey);
    });
    deduped.push(sorted[0]);
  }

  return deduped;
}

export function collectBubbleSchema(input: BubbleSchemaInput): CanonicalSchema {
  const types = input.database.types ?? [];
  const optionItems = input.optionSets?.items ?? [];

  const customTables: CanonicalTable[] = types.map((type) => ({
    schema: "custom",
    key: type.key,
    name: type.name,
    fields: (type.fields ?? []).map((field) => ({
      sourceKey: field.key,
      displayName: field.displayName,
      normalizedDisplayName: canonicalDisplayName(field.displayName || field.key),
      emittedName: normalizeWhitespace(field.displayName || field.key),
      isDeleted: isDeletedToken(field.displayName || "") || isDeletedToken(field.key || ""),
      isList: Boolean(field.isList),
      kind: "primitive",
      typeToken: field.dbType || "varchar",
      priority: 1,
    })),
  }));

  const optionTables: CanonicalTable[] = optionItems.map((set) => ({
    schema: "option",
    key: set.key,
    name: set.name,
    fields: (set.attributes ?? []).map((attr) => ({
      sourceKey: attr.key,
      displayName: attr.displayName,
      normalizedDisplayName: canonicalDisplayName(attr.displayName || attr.key),
      emittedName: normalizeWhitespace(attr.displayName || attr.key),
      isDeleted: isDeletedToken(attr.displayName || "") || isDeletedToken(attr.key || ""),
      isList: Boolean(attr.isList),
      kind: "primitive",
      typeToken: attr.dbType || "varchar",
      priority: 1,
    })),
  }));

  return {
    mode: "strict",
    tables: [...customTables, ...optionTables],
  };
}

export function normalizeSchema(schema: CanonicalSchema, options: { mode?: DbmlMode } = {}): CanonicalSchema {
  const mode: DbmlMode = options.mode ?? "strict";

  const normalizedTables = schema.tables
    .map((table) => {
      const normalized = table.fields
        .map((field) =>
          buildCanonicalField(
            {
              key: field.sourceKey,
              displayName: field.displayName,
              rawType: "",
              baseType: "",
              dbType: field.typeToken,
              isList: field.isList,
            },
            mode,
            field.sourceKey,
          ),
        )
        .filter((f): f is CanonicalField => Boolean(f));

      return {
        ...table,
        fields: dedupeFields(normalized, mode),
      };
    })
    .sort((a, b) => `${a.schema}.${a.key}`.localeCompare(`${b.schema}.${b.key}`));

  return {
    mode,
    tables: normalizedTables,
  };
}

function normalizeTableFields(
  table: BubbleTypeInput | BubbleOptionSetInput,
  schema: TableSchema,
  mode: DbmlMode,
): CanonicalField[] {
  const sourceFields = schema === "custom" ? (table as BubbleTypeInput).fields : (table as BubbleOptionSetInput).attributes;
  const normalized: CanonicalField[] = [];
  for (const field of sourceFields ?? []) {
    const canonical = buildCanonicalField(field, mode, field.key);
    if (canonical) normalized.push(canonical);
  }
  return dedupeFields(normalized, mode);
}

export function buildDbmlModel(
  input: BubbleSchemaInput,
  options: { mode?: DbmlMode } = {},
): DbmlModel {
  const mode: DbmlMode = options.mode ?? "strict";
  const types = input.database.types ?? [];
  const optionItems = input.optionSets?.items ?? [];

  const customKeyToName = new Map<string, string>();
  for (const type of types) customKeyToName.set(type.key, type.name);
  customKeyToName.set("user", customKeyToName.get("user") ?? "User");

  const optionKeySet = new Set(optionItems.map((item) => item.key));

  const tables: DbmlTable[] = [];

  for (const type of types) {
    const fields = normalizeTableFields(type, "custom", mode);
    tables.push({
      schema: "custom",
      key: type.key,
      displayName: type.name,
      columns: [
        { name: "_id", type: "varchar" },
        ...fields.map((field) => ({
          name: field.emittedName,
          type: field.typeToken,
          note: field.displayName !== field.emittedName ? `Bubble label: ${field.displayName}` : undefined,
        })),
      ],
    });
  }

  for (const option of optionItems) {
    const fields = normalizeTableFields(option, "option", mode);
    tables.push({
      schema: "option",
      key: option.key,
      displayName: option.name,
      columns: fields.map((field) => ({
        name: field.emittedName,
        type: field.typeToken,
      })),
    });
  }

  tables.sort((a, b) => `${a.schema}.${a.key}`.localeCompare(`${b.schema}.${b.key}`));

  const refs: DbmlRef[] = [];
  const refDedup = new Set<string>();

  for (const type of types) {
    const fields = normalizeTableFields(type, "custom", mode);
    for (const field of fields) {
      if (field.kind !== "customRef" && field.kind !== "userRef") continue;
      const targetKey = field.targetKey;
      if (!targetKey || !customKeyToName.has(targetKey)) continue;
      if (targetKey === "user" && !customKeyToName.get("user")) continue;

      const ref: DbmlRef = {
        fromSchema: "custom",
        fromTable: type.key,
        fromColumn: field.emittedName,
        toSchema: "custom",
        toTable: targetKey,
        toColumn: "_id",
        isList: field.isList,
      };
      const dedupeKey = `${ref.fromSchema}.${ref.fromTable}.${ref.fromColumn}:${ref.toSchema}.${ref.toTable}.${ref.toColumn}:${ref.isList ? "1" : "0"}`;
      if (!refDedup.has(dedupeKey)) {
        refDedup.add(dedupeKey);
        refs.push(ref);
      }
    }

    for (const field of fields) {
      if (field.kind !== "optionType") continue;
      if (!field.targetKey || !optionKeySet.has(field.targetKey)) continue;
      // Strict mode intentionally skips option refs to avoid fabricated joins.
    }
  }

  refs.sort((a, b) =>
    `${a.fromSchema}.${a.fromTable}.${a.fromColumn}`.localeCompare(
      `${b.fromSchema}.${b.fromTable}.${b.fromColumn}`,
    ),
  );

  return { tables, refs };
}

