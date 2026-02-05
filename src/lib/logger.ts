import fs from 'fs';
import os from 'os';
import path from 'path';
import pino from 'pino';
import { consoleLogging, logFilePath, logLevel } from './config.js';

function ensureLogDirectory(filePath: string) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
}

function resolveLogDestination(): string {
  try {
    ensureLogDirectory(logFilePath);
    return logFilePath;
  } catch (error) {
    const fallback = path.join(os.tmpdir(), 'onenote-mcp.log');
    try {
      ensureLogDirectory(fallback);
    } catch (fallbackError) {
      // Last resort: let pino attempt to open whatever it can.
    }
    return fallback;
  }
}

const destinations = [];
const logDestination = resolveLogDestination();
destinations.push({
  stream: pino.destination({ dest: logDestination, sync: false })
});

if (consoleLogging) {
  destinations.push({ stream: process.stderr });
}

export const logger = pino(
  {
    level: logLevel
  },
  destinations.length === 1
    ? destinations[0].stream
    : pino.multistream(destinations)
);

export const logMetadata = {
  logFilePath: logDestination,
  logLevel,
  consoleLogging
};
