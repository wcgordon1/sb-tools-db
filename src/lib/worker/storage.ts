import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { InspectSuccessResponse } from "./types";

const DATA_DIR = join(process.cwd(), "data", "inspections");

/**
 * Saves a successful inspection response to a local JSON file.
 * Only active in development — silently no-ops in production.
 */
export async function saveInspectionResult(
  data: InspectSuccessResponse,
): Promise<string | null> {
  if (!import.meta.env.DEV) return null;

  try {
    await mkdir(DATA_DIR, { recursive: true });

    const slug = urlToSlug(data.submittedUrl);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${timestamp}_${slug}.json`;
    const filepath = join(DATA_DIR, filename);

    await writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[worker-storage] saved inspection to ${filepath}`);

    return filepath;
  } catch (err) {
    console.error(
      "[worker-storage] failed to save inspection:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

function urlToSlug(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/[^a-z0-9]/gi, "-").slice(0, 60);
  } catch {
    return "unknown";
  }
}
