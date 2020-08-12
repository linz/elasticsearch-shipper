import pino from 'pino';

export const hash = process.env.GIT_HASH;
export const version = process.env.GIT_VERSION;

export const Log = pino().child({ package: { hash, version } });
