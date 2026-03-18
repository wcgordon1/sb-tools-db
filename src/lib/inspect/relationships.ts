export interface MermaidRef {
  fromType: string;
  fromField: string;
  toType: string;
  isList: boolean;
}

export interface MermaidFieldLike {
  displayName: string;
  baseType?: string;
  rawType?: string;
  isList?: boolean;
}

export interface MermaidTypeLike {
  key: string;
  name: string;
  fields: MermaidFieldLike[];
}

export interface MermaidDatabaseLike {
  types?: MermaidTypeLike[];
  refs?: MermaidRef[];
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

export function collectRefsFromFields(types: MermaidTypeLike[]): MermaidRef[] {
  const keyToName = new Map<string, string>();
  for (const type of types) keyToName.set(type.key, type.name);

  const inferred: MermaidRef[] = [];

  for (const type of types) {
    for (const field of type.fields) {
      if (!field.displayName || isDeletedField(field.displayName)) continue;

      const keyFromBaseType = extractCustomTypeKey(field.baseType);
      const keyFromRawType = extractCustomTypeKey(field.rawType);
      const toTypeKey = keyFromBaseType ?? keyFromRawType;
      if (!toTypeKey) continue;

      const toTypeName = keyToName.get(toTypeKey);
      if (!toTypeName) continue;

      inferred.push({
        fromType: type.name,
        fromField: field.displayName,
        toType: toTypeName,
        isList: Boolean(field.isList),
      });
    }
  }

  return inferred;
}

export function mergeRefs(existingRefs: MermaidRef[], inferredRefs: MermaidRef[]): MermaidRef[] {
  const merged = new Map<string, MermaidRef>();
  for (const ref of [...existingRefs, ...inferredRefs]) {
    const key = `${ref.fromType}::${ref.fromField}::${ref.toType}::${ref.isList ? "1" : "0"}`;
    if (!merged.has(key)) merged.set(key, ref);
  }
  return [...merged.values()];
}

export function buildMermaidRefs(database: MermaidDatabaseLike): MermaidRef[] {
  const types = database.types ?? [];
  const existingRefs = database.refs ?? [];
  const inferredRefs = collectRefsFromFields(types);
  return mergeRefs(existingRefs, inferredRefs);
}

