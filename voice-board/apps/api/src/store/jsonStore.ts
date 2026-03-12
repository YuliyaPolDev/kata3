import fs from 'fs/promises';

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  const raw = JSON.stringify(value, null, 2);
  await fs.writeFile(filePath, raw, 'utf-8');
}
