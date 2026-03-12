import { nanoid } from 'nanoid';

import type { Comment } from '../models';
import { readJsonFile, writeJsonFile } from '../store/jsonStore';
import { dbPaths } from '../store/paths';

export async function listComments(concernId: string): Promise<Comment[]> {
  const all = await readJsonFile<Comment[]>(dbPaths.comments, []);
  return all.filter((c) => c.concernId === concernId);
}

export async function addComment(concernId: string, text: string): Promise<Comment> {
  const all = await readJsonFile<Comment[]>(dbPaths.comments, []);
  const comment: Comment = {
    id: nanoid(),
    concernId,
    text,
    createdAt: new Date().toISOString()
  };
  all.unshift(comment);
  await writeJsonFile(dbPaths.comments, all);
  return comment;
}
