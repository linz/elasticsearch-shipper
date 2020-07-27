import pino from 'pino';

export const hash = process.env.GIT_HASH;
export const version = process.env.GIT_VERSION;

export const logger = pino().child({ package: { hash, version } });
