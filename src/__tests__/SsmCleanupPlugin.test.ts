import { SsmCleanupPlugin } from '../index';

describe('SsmCleanupPlugin', () => {
  let plugin: SsmCleanupPlugin;

  beforeEach(() => {
    plugin = new SsmCleanupPlugin();
  });

  it('should have correct name', () => {
    expect(plugin.name).toBe('ssm-cleanup');
  });

  it('should be defined', () => {
    expect(plugin).toBeDefined();
  });
});
