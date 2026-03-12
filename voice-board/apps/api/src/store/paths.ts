import path from 'path';

export const dataDbDir = path.resolve(process.cwd(), '../../data/db');
export const dataPoliciesDir = path.resolve(process.cwd(), '../../data/policies');

export const dbPaths = {
  concerns: path.join(dataDbDir, 'concerns.json'),
  votes: path.join(dataDbDir, 'votes.json'),
  comments: path.join(dataDbDir, 'comments.json'),
  clusters: path.join(dataDbDir, 'clusters.json')
} as const;
