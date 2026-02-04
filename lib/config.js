import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, '..');
export const tokenFilePath = path.join(projectRoot, '.access-token.txt');

export const clientId = '14d82eec-204b-4c2f-b7e8-296a70dab67e';
export const scopes = [
  'Notes.Read.All',
  'Notes.ReadWrite.All',
  'User.Read',
  'Group.Read.All'
];
