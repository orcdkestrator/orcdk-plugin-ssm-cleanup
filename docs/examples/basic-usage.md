# SSM Cleanup Plugin Examples

## Basic Configuration

```json
{
  "plugins": {
    "@orcdkestrator/ssm-cleanup": {
      "enabled": true,
      "config": {
        "parameterPaths": ["/myapp/dev"]
      }
    }
  }
}
```

## With Exclusions

```json
{
  "plugins": {
    "@orcdkestrator/ssm-cleanup": {
      "enabled": true,
      "config": {
        "parameterPaths": ["/myapp/dev", "/myapp/staging"],
        "excludePatterns": [
          "*/secrets/*",
          "*/prod/*",
          "*-permanent"
        ]
      }
    }
  }
}
```

## Dry Run Mode

```json
{
  "plugins": {
    "@orcdkestrator/ssm-cleanup": {
      "enabled": true,
      "config": {
        "parameterPaths": ["/myapp"],
        "dryRun": true,
        "deleteEmptyPaths": true
      }
    }
  }
}
```

## Advanced Configuration

```json
{
  "plugins": {
    "@orcdkestrator/ssm-cleanup": {
      "enabled": true,
      "config": {
        "parameterPaths": [
          "/myapp/${STAGE}",
          "/shared/${STAGE}"
        ],
        "excludePatterns": [
          "*/config/base/*",
          "*-donotdelete"
        ],
        "batchSize": 10,
        "deleteEmptyPaths": true,
        "dryRun": false
      }
    }
  }
}
```

## Usage Examples

```bash
# Dry run to see what would be deleted
orcdk destroy --env dev --dry-run

# Output:
# SSM Cleanup: Found 15 parameters under /myapp/dev
# Would delete: /myapp/dev/api-url
# Would delete: /myapp/dev/table-name
# Excluded: /myapp/dev/secrets/api-key (matches */secrets/*)
# Total: 12 would be deleted, 3 excluded

# Actual cleanup
orcdk destroy --env dev

# Cleanup specific paths
export SSM_CLEANUP_PATHS="/temp,/test"
orcdk destroy
```

## Integration with CDK

```typescript
// Parameters created by CDK
new StringParameter(this, 'ApiUrl', {
  parameterName: `/myapp/${props.stage}/api-url`,
  stringValue: api.url
});

// These will be cleaned up when the stack is destroyed
```
