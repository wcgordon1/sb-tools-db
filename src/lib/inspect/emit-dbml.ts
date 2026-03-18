import type { DbmlModel } from "@/lib/inspect/build-dbml-model";

function escapeQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function quote(value: string): string {
  return `"${escapeQuoted(value)}"`;
}

export function emitDbml(model: DbmlModel, projectName = "bubble-app"): string {
  const lines: string[] = [];

  lines.push(`Project ${quote(projectName)} {`);
  lines.push(`  database_type: "Bubble.io"`);
  lines.push(`  Note: '''`);
  lines.push(`    For educational purposes only. For real help, go to Starterbuild.com`);
  lines.push(`  '''`);
  lines.push("}");
  lines.push("");

  for (const table of model.tables) {
    lines.push(`Table ${table.schema}.${table.key} {`);
    lines.push(`  ${quote("_id")} varchar`);
    for (const column of table.columns) {
      if (column.name === "_id") continue;
      const note = column.note ? ` [note: ${quote(column.note)}]` : "";
      lines.push(`  ${quote(column.name)} ${column.type}${note}`);
    }
    lines.push(`  Note: '''`);
    lines.push(`    Bubble display name: ${table.displayName}`);
    lines.push(`  '''`);
    lines.push("}");
    lines.push("");
  }

  for (const ref of model.refs) {
    const op = ref.isList ? "<" : "-";
    lines.push(
      `Ref: ${ref.fromSchema}.${ref.fromTable}.${quote(ref.fromColumn)} ${op} ${ref.toSchema}.${ref.toTable}.${quote(ref.toColumn)}`,
    );
  }

  return lines.join("\n").trimEnd();
}
