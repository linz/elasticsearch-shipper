import { LogShipperConfig } from '../config/config';

export const ExampleConfigMinimal: LogShipperConfig = {
  elastic: { url: 'https://' },
  prefix: 'centralised-logging',
  index: 'monthly',
  accounts: [
    {
      id: '1234567890',
      name: 'linz',
      tags: ['hello'],
      logGroups: [{ filter: '**' }],
    },
  ],
};

export const ExampleConfigComplexe: LogShipperConfig = {
  elastic: { url: 'https://' },
  prefix: 'centralised-logging',
  index: 'monthly',
  accounts: [
    {
      id: '123456789',
      name: 'linz',
      prefix: 'foo',
      index: 'weekly',
      drop: true,
      logGroups: [{ filter: '**', drop: false, index: 'daily', prefix: 'all-tags' }],
    },
  ],
};
