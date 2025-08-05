import { SsmCleanupPlugin } from '../index';
import { PluginConfig, OrcdkConfig } from '@orcdkestrator/core';

describe('SsmCleanupPlugin', () => {
  let plugin: SsmCleanupPlugin;
  let mockConfig: PluginConfig;
  let mockOrcdkConfig: OrcdkConfig;

  beforeEach(() => {
    mockConfig = {
      name: 'ssm-cleanup',
      enabled: true,
      options: {}
    };

    mockOrcdkConfig = {
      version: '1.0.0',
      environments: {},
      isLocal: true,
      plugins: []
    };

    plugin = new SsmCleanupPlugin();
  });

  it('should have correct name', () => {
    expect(plugin.name).toBe('ssm-cleanup');
  });

  it('should be defined', () => {
    expect(plugin).toBeDefined();
  });
});
