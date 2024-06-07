import { afterAll, beforeAll, expect, it } from '@jest/globals';

import { ChainfileTestcontainers } from '../src';
import localhost from './hardhat.json';

let testcontainers: ChainfileTestcontainers;

beforeAll(async () => {
  testcontainers = await ChainfileTestcontainers.start(localhost);
});

afterAll(async () => {
  await testcontainers.stop();
});

it('should rpc(eth_blockNumber)', async () => {
  const response = await testcontainers.get('hardhat').rpc({
    method: 'eth_blockNumber',
  });

  expect(response.status).toStrictEqual(200);

  expect(await response.json()).toMatchObject({
    result: '0x0',
  });
});
