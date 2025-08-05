# SSM Cleanup Plugin API Reference

## Plugin Configuration

```typescript
interface SSMCleanupConfig {
  enabled: boolean;
  parameterPaths?: string[];
  dryRun?: boolean;
  excludePatterns?: string[];
  batchSize?: number;
  deleteEmptyPaths?: boolean;
}
```

## Lifecycle Hooks

### `beforeStackDestroy`
Scans and removes SSM parameters before stack destruction.

### `afterStackDestroy`
Verifies cleanup completion and reports any remaining parameters.

## Methods

### `initialize(config: PluginConfig, orcdkConfig: OrcdkConfig): Promise<void>`
Initializes the plugin with configuration.

### `scanParameters(path: string): Promise<Parameter[]>`
Recursively scans for all parameters under the specified path.

### `cleanupParameters(parameters: string[], dryRun: boolean): Promise<CleanupResult>`
Deletes the specified parameters, optionally in dry-run mode.

### `shouldExclude(parameterName: string): boolean`
Checks if a parameter matches any exclusion patterns.

### `deleteParameter(name: string): Promise<void>`
Deletes a single SSM parameter.

## Types

```typescript
interface Parameter {
  name: string;
  type: 'String' | 'StringList' | 'SecureString';
  lastModifiedDate: Date;
  value?: string;
}

interface CleanupResult {
  scanned: number;
  deleted: number;
  excluded: number;
  failed: number;
  errors: CleanupError[];
}

interface CleanupError {
  parameter: string;
  error: string;
}
```
