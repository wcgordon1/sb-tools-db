import type { MermaidRef } from "@/lib/inspect/relationships";

export interface ViewFieldLike {
  key?: string;
  displayName: string;
  baseType?: string;
  rawType?: string;
  isList?: boolean;
  dbType?: string;
  isRelationship?: boolean;
}

export interface ViewTypeLike {
  key: string;
  name: string;
  fields: ViewFieldLike[];
}

export interface ViewDatabaseLike {
  types?: ViewTypeLike[];
}

export interface ViewOptionSetsLike {
  items?: Array<{ key: string; name: string }>;
}

export interface ViewStats {
  typeCount: number;
  fieldCount: number;
  relCount: number;
  optionSetCount: number;
  deletedFieldCount: number;
}

export interface DeletedTypeLike extends ViewTypeLike {
  fields: ViewFieldLike[];
}

interface BuildViewRefsOptions {
  includeDeleted?: boolean;
}

function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function isDeletedField(name: string): boolean {
  return /\bdeleted\b/i.test(normalizeFieldName(name));
}

function extractCustomTypeKey(typeToken?: string): string | null {
  if (!typeToken) return null;

  const direct = typeToken.match(/^custom\.([a-zA-Z0-9_]+)(?:\[\])?$/);
  if (direct) return direct[1];

  const list = typeToken.match(/^list\.custom\.([a-zA-Z0-9_]+)$/);
  if (list) return list[1];

  return null;
}

export function buildViewRefs(
  database: ViewDatabaseLike,
  options: BuildViewRefsOptions = {},
): MermaidRef[] {
  const includeDeleted = Boolean(options.includeDeleted);
  const types = database.types ?? [];
  const keyToName = new Map<string, string>();
  for (const type of types) keyToName.set(type.key, type.name);

  const refs: MermaidRef[] = [];
  const dedupe = new Map<string, MermaidRef>();

  for (const type of types) {
    for (const field of type.fields ?? []) {
      const fieldName = field.displayName ?? "";
      if (!fieldName) continue;
      const deleted = isDeletedField(fieldName);
      if (!includeDeleted && deleted) continue;
      if (includeDeleted && !deleted) continue;

      // Exclude option set links from View refs.
      if ((field.baseType ?? "").startsWith("option.") || (field.rawType ?? "").startsWith("list.option.")) {
        continue;
      }

      const customTarget = extractCustomTypeKey(field.baseType) ?? extractCustomTypeKey(field.rawType);

      let toType: string | null = null;
      if (customTarget) {
        toType = keyToName.get(customTarget) ?? null;
      } else if (field.baseType === "user" || field.rawType === "list.user") {
        toType = keyToName.get("user") ?? "User";
      }

      if (!toType) continue;

      const ref: MermaidRef = {
        fromType: type.name,
        fromField: fieldName,
        toType,
        isList: Boolean(field.isList),
      };

      const key = `${ref.fromType}::${ref.fromField}::${ref.toType}::${ref.isList ? "1" : "0"}`;
      if (!dedupe.has(key)) dedupe.set(key, ref);
    }
  }

  refs.push(...dedupe.values());
  return refs;
}

export function indexRefsByType(refs: MermaidRef[]): {
  incomingByType: Map<string, MermaidRef[]>;
  outgoingByType: Map<string, MermaidRef[]>;
} {
  const incomingByType = new Map<string, MermaidRef[]>();
  const outgoingByType = new Map<string, MermaidRef[]>();

  for (const ref of refs) {
    const out = outgoingByType.get(ref.fromType) ?? [];
    out.push(ref);
    outgoingByType.set(ref.fromType, out);

    const incoming = incomingByType.get(ref.toType) ?? [];
    incoming.push(ref);
    incomingByType.set(ref.toType, incoming);
  }

  return { incomingByType, outgoingByType };
}

export function buildViewStats(
  database: ViewDatabaseLike,
  optionSets: ViewOptionSetsLike | undefined,
  refs: MermaidRef[],
  options: { deletedFieldCount?: number } = {},
): ViewStats {
  const types = database.types ?? [];
  const fieldCount = types.reduce((sum, t) => sum + (t.fields?.length ?? 0), 0);
  const optionSetCount = optionSets?.items?.length ?? 0;
  const deletedFieldCount = options.deletedFieldCount
    ?? types.reduce(
      (sum, t) => sum + (t.fields?.filter((f) => isDeletedField(f.displayName ?? "")).length ?? 0),
      0,
    );

  return {
    typeCount: types.length,
    fieldCount,
    relCount: refs.length,
    optionSetCount,
    deletedFieldCount,
  };
}

export function buildDeletedTypes(database: ViewDatabaseLike): DeletedTypeLike[] {
  const types = database.types ?? [];
  const deletedTypes = types
    .map((type) => ({
      ...type,
      fields: (type.fields ?? []).filter((field) => isDeletedField(field.displayName ?? "")),
    }))
    .filter((type) => type.fields.length > 0);

  return deletedTypes;
}
