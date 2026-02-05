import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, '..', '..');
export const tokenFilePath = path.join(projectRoot, '.access-token.txt');

export const clientId =
  process.env.CLIENT_ID ?? '14d82eec-204b-4c2f-b7e8-296a70dab67e';

export const scopes = [
  'Notes.Read.All',
  'Notes.ReadWrite.All',
  'User.Read',
  'Group.Read.All'
];

const tokenStorageRaw = (
  process.env.ONENOTE_MCP_TOKEN_STORAGE ?? 'keychain'
).toLowerCase();
const tokenStorageValues = new Set(['keychain', 'file', 'env']);
export const tokenStorage = tokenStorageValues.has(tokenStorageRaw)
  ? tokenStorageRaw
  : 'keychain';
export const tokenStorageConfigured = tokenStorageRaw;

export const logLevel = process.env.ONENOTE_MCP_LOG_LEVEL ?? 'info';
export const consoleLogging = /^(true|1|yes)$/i.test(
  process.env.ONENOTE_MCP_CONSOLE_LOGGING ?? ''
);

const defaultLogDirectory = () => {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Logs', 'onenote-mcp');
  }
  if (process.platform === 'win32') {
    const base =
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
    return path.join(base, 'onenote-mcp', 'logs');
  }
  return path.join(os.homedir(), '.local', 'state', 'onenote-mcp');
};

export const logFilePath =
  process.env.ONENOTE_MCP_LOG_FILE ??
  path.join(defaultLogDirectory(), 'server.log');

export const keychainService = 'onenote-mcp';
export const keychainAccount = 'graph-access-token';
