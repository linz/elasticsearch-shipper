import { LogShipperConfigAccount } from '../config/config';

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
