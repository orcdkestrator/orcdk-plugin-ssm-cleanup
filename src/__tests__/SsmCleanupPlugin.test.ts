import { SSMCleanupPlugin } from '../index';

describe('SSMCleanupPlugin', () => {
  let plugin: SSMCleanupPlugin;

  beforeEach(() => {
    plugin = new SSMCleanupPlugin();
  });

  it('should have correct name', () => {
    expect(plugin.name).toBe('ssm-cleanup');
  });

  it('should be defined', () => {
    expect(plugin).toBeDefined();
  });
});
