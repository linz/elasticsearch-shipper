import { LogShipperConfigAccount } from '../config/config';

export const ExampleConfigKeys = ['/es-shipper-config/config-min'];

export const ExampleConfigMinimal: LogShipperConfigAccount = {
  elastic: '/es-shipper-config/account-min',
  prefix: 'centralised-logging',
  id: '1234567890',
  name: 'linz',
  index: 'weekly',
  tags: ['hello'],
  logGroups: [{ filter: '**' }],
};

export const ExampleConfigComplex: LogShipperConfigAccount = {
  elastic: '/es-shipper-config/account-complex',
  id: '123456789',
  name: 'linz',
  prefix: 'foo',
  index: 'weekly',
  drop: true,
  logGroups: [{ filter: '**', drop: false, index: 'daily', prefix: 'all-tags' }],
};

export const ExampleConfigMap: Record<string, unknown> = {
  '/es-shipper-config/accounts': ExampleConfigKeys,
  '/es-shipper-config/config-min': ExampleConfigMinimal,
  '/es-shipper-config/config-complex': ExampleConfigComplex,
};

export async function configLookup(key: string): Promise<unknown> {
  return ExampleConfigMap[key];
}
