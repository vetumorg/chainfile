import { Chainfile } from '@chainfile/schema';
import { describe, expect, it } from '@jest/globals';

import { Compose } from './compose';

describe('synth', () => {
  const chainfile: Chainfile = {
    $schema: 'https://chainfile.org/schema.json',
    caip2: 'eip155:0',
    name: 'Example',
    values: {
      url: 'http://${rpc_user}:${rpc_password}@dns:1234',
      version: {},
      rpc_user: {
        random: {
          type: 'bytes',
          length: 16,
          encoding: 'hex',
        },
      },
      rpc_password: {
        random: {
          type: 'bytes',
          length: 16,
          encoding: 'hex',
        },
      },
    },
    containers: {
      dns: {
        image: 'docker.io/trufflesuite/ganache',
        tag: {
          $value: 'version',
        },
        source: 'https://github.com/trufflesuite/ganache',
        endpoints: {
          rpc: {
            port: 8545,
            protocol: 'HTTP JSON-RPC 2.0',
            authorization: {
              type: 'HttpBasic',
              username: {
                $value: 'rpc_user',
              },
              password: {
                $value: 'rpc_password',
              },
            },
            probes: {
              readiness: {
                params: [],
                method: 'eth_blockNumber',
                match: {
                  result: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        environment: {
          RPCUSER: {
            $value: 'rpc_user',
          },
          RPCPASSWORD: {
            $value: 'rpc_password',
          },
        },
        resources: {
          cpu: 0.25,
          memory: 256,
        },
      },
      another: {
        image: 'docker.io/trufflesuite/ganache',
        tag: 'v7.9.2',
        source: 'https://github.com/trufflesuite/ganache',
        command: ['sh', '-c', 'echo ${ENV_1} ${ENV_2}'],
        environment: {
          ENV_1: 'value_1',
          ENV_2: {
            $value: 'url',
          },
        },
        resources: {
          cpu: 0.25,
          memory: 256,
        },
      },
    },
  };

  const compose = new Compose(
    chainfile,
    {
      version: 'v1',
    },
    'suffix',
  );

  it('should synth .env', async () => {
    expect(compose.synthDotEnv().split('\n')).toStrictEqual([
      expect.stringMatching(/^url=http:\/\/[0-9a-f]{32}:[0-9a-f]{32}@dns:1234$/),
      'version=v1',
      expect.stringMatching(/^rpc_user=[0-9a-f]{32}$/),
      expect.stringMatching(/^rpc_password=[0-9a-f]{32}$/),
      expect.stringMatching(/^CHAINFILE_VALUES=\{.+}$/),
    ]);
  });

  it('should synth compose.yml', async () => {
    expect(compose.synthCompose().split('\n')).toStrictEqual([
      '# Generated by @chainfile/docker:0.0.0, do not edit manually.',
      '# Version: 0.0.0',
      '# Chainfile Name: Example',
      '# Chainfile CAIP-2: eip155:0',
      '',
      'name: example',
      'services:',
      '  agent:',
      '    container_name: agent-suffix',
      '    image: ghcr.io/vetumorg/chainfile-agent:0.0.0',
      '    ports:',
      "      - '0:1569'",
      '    environment:',
      '      CHAINFILE_JSON: >-',
      '        {"$$schema":"https://chainfile.org/schema.json","caip2":"eip155:0","name":"Example","values":{"url":"http://$${rpc_user}:$${rpc_password}@dns:1234","version":{},"rpc_user":{"random":{"type":"bytes","length":16,"encoding":"hex"}},"rpc_password":{"random":{"type":"bytes","length":16,"encoding":"hex"}}},"containers":{"dns":{"image":"docker.io/trufflesuite/ganache","tag":{"$$value":"version"},"source":"https://github.com/trufflesuite/ganache","endpoints":{"rpc":{"port":8545,"protocol":"HTTP',
      '        JSON-RPC',
      '        2.0","authorization":{"type":"HttpBasic","username":{"$$value":"rpc_user"},"password":{"$$value":"rpc_password"}},"probes":{"readiness":{"params":[],"method":"eth_blockNumber","match":{"result":{"type":"string"}}}}}},"environment":{"RPCUSER":{"$$value":"rpc_user"},"RPCPASSWORD":{"$$value":"rpc_password"}},"resources":{"cpu":0.25,"memory":256}},"another":{"image":"docker.io/trufflesuite/ganache","tag":"v7.9.2","source":"https://github.com/trufflesuite/ganache","command":["sh","-c","echo',
      '        $${ENV_1}',
      '        $${ENV_2}"],"environment":{"ENV_1":"value_1","ENV_2":{"$$value":"url"}},"resources":{"cpu":0.25,"memory":256}}}}',
      '      CHAINFILE_VALUES: ${CHAINFILE_VALUES}',
      expect.stringMatching(/ {6}DEBUG: .+/),
      '    volumes:',
      '      - type: volume',
      '        source: chainfile',
      '        target: /var/chainfile',
      '    networks:',
      '      chainfile: {}',
      '  dns:',
      '    container_name: dns-suffix',
      '    image: docker.io/trufflesuite/ganache:${version}',
      '    environment:',
      '      RPCUSER: ${rpc_user}',
      '      RPCPASSWORD: ${rpc_password}',
      '    ports:',
      "      - '0:8545'",
      '    volumes:',
      '      - type: volume',
      '        source: chainfile',
      '        target: /var/chainfile',
      '    networks:',
      '      chainfile: {}',
      '  another:',
      '    container_name: another-suffix',
      '    image: docker.io/trufflesuite/ganache:v7.9.2',
      '    command:',
      '      - sh',
      "      - '-c'",
      '      - echo $${ENV_1} $${ENV_2}',
      '    environment:',
      '      ENV_1: value_1',
      '      ENV_2: ${url}',
      '    ports: []',
      '    volumes:',
      '      - type: volume',
      '        source: chainfile',
      '        target: /var/chainfile',
      '    networks:',
      '      chainfile: {}',
      'networks:',
      '  chainfile: {}',
      'volumes:',
      '  chainfile: {}',
      '',
    ]);
  });
});

it('should fail to synth with invalid chainfile', async () => {
  expect(() => new Compose({} as any, {})).toThrowError();
});

it('should have different suffix when using different Compose', async () => {
  const file: Chainfile = {
    $schema: 'https://chainfile.org/schema.json',
    caip2: 'eip155:1337',
    name: 'Ganache',
    containers: {
      ganache: {
        image: 'docker.io/trufflesuite/ganache',
        tag: 'v7.9.2',
        source: 'https://github.com/trufflesuite/ganache',
        resources: {
          cpu: 0.25,
          memory: 256,
        },
        endpoints: {},
      },
    },
  };

  const compose1 = new Compose(file, {});
  const compose2 = new Compose(file, {});
  expect(compose1.suffix).not.toEqual(compose2.suffix);
});
