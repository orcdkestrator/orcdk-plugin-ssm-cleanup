/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { SSMClient, GetParametersByPathCommand, DeleteParametersCommand } from '@aws-sdk/client-ssm';
import { Plugin, PluginConfig, OrcdkConfig, AWSCommandFactory, EventBus, EventTypes, OrcdkEvent } from '@orcdkestrator/core';

/**
 * SSM cleanup plugin for managing parameter store cleanup after stack destruction
 * Migrated from DeployManager SSMCleanup
 */
export class SSMCleanupPlugin implements Plugin {
  public readonly name = '@orcdkestrator/orcdk-plugin-ssm-cleanup';
  public readonly version = '1.0.0';
  
  private config: PluginConfig | null = null;
  private orcdkConfig: OrcdkConfig | null = null;
  private ssm: SSMClient | null = null;
  private aggressiveEnvironments: string[] = [];
  private eventBus: EventBus | null = null;

  /**
   * Initialize plugin with configuration
   */
  async initialize(config: PluginConfig, orcdkConfig: OrcdkConfig): Promise<void> {
    this.config = config;
    this.orcdkConfig = orcdkConfig;
    
    // Extract configuration
    this.aggressiveEnvironments = (config.config?.aggressiveEnvironments as string[]) || [
      'local', 'development', 'test'
    ];
    
    // Initialize AWS SSM client with potential LocalStack endpoint
    const endpoint = AWSCommandFactory.getAWSEndpoint(orcdkConfig);
    this.ssm = new SSMClient({
      region: process.env.AWS_REGION || 'us-west-2',
      ...(endpoint && { endpoint }),
    });
    
    // Subscribe to events
    this.eventBus = EventBus.getInstance();
    this.subscribeToEvents();
  }
  
  /**
   * Subscribe to relevant events
   */
  private subscribeToEvents(): void {
    if (!this.eventBus) return;
    
    // Listen for stack destroy events
    this.eventBus.on(EventTypes['orchestrator:after:stack-destroy'], async (event: unknown) => {
      const typedEvent = event as OrcdkEvent<{ stackName: string; success: boolean }>;
      const { stackName, success } = typedEvent.data;
      if (success) {
        await this.cleanupStackParameters(stackName);
      }
    });
    
    // Listen for error events
    this.eventBus.on(EventTypes['plugin:error'], (event: unknown) => {
      const typedEvent = event as OrcdkEvent<{ error: Error; context: string }>;
      const { error, context } = typedEvent.data;
      console.error(`[ssm-cleanup] Error in ${context}:`, error.message);
    });
  }

  /**
   * Cleanup SSM parameters for a specific stack
   */
  private async cleanupStackParameters(stackName: string): Promise<void> {
    if (!this.ssm || !this.orcdkConfig) {
      return;
    }

    const currentEnv = process.env.CDK_ENVIRONMENT;
    if (!currentEnv) {
      return;
    }

    const envConfig = this.orcdkConfig.environments[currentEnv];
    if (!envConfig) {
      return;
    }

    console.log(`[ssm-cleanup] Cleaning up parameters for stack: ${stackName}`);

    try {
      // Determine cleanup strategy based on environment
      const isAggressive = this.aggressiveEnvironments.includes(currentEnv);
      
      if (isAggressive) {
        await this.aggressiveCleanup(stackName);
      } else {
        await this.conservativeCleanup(stackName);
      }
    } catch (error) {
      console.error(`[ssm-cleanup] Failed to cleanup parameters for ${stackName}:`, error);
    }
  }

  /**
   * Aggressive cleanup for development environments
   * Removes all parameters that might be related to the stack
   */
  private async aggressiveCleanup(stackName: string): Promise<void> {
    if (!this.ssm) return;

    const patterns = [
      `/${stackName}/`,
      `/${stackName.toLowerCase()}/`,
      `/${stackName}`,
      `/${stackName.toLowerCase()}`,
    ];

    for (const pattern of patterns) {
      try {
        const parameters = await this.listParametersByPrefix(pattern);
        if (parameters.length > 0) {
          await this.deleteParameters(parameters);
          console.log(`[ssm-cleanup] Deleted ${parameters.length} parameters with prefix: ${pattern}`);
        }
      } catch (error) {
        console.warn(`[ssm-cleanup] Failed to cleanup pattern ${pattern}:`, error);
      }
    }
  }

  /**
   * Conservative cleanup for production environments
   * Only removes parameters with exact stack name matches
   */
  private async conservativeCleanup(stackName: string): Promise<void> {
    if (!this.ssm) return;

    const exactPrefixes = [
      `/${stackName}/`,
    ];

    for (const prefix of exactPrefixes) {
      try {
        const parameters = await this.listParametersByPrefix(prefix);
        if (parameters.length > 0) {
          await this.deleteParameters(parameters);
          console.log(`[ssm-cleanup] Deleted ${parameters.length} parameters with prefix: ${prefix}`);
        }
      } catch (error) {
        console.warn(`[ssm-cleanup] Failed to cleanup prefix ${prefix}:`, error);
      }
    }
  }

  /**
   * List parameters by prefix
   */
  private async listParametersByPrefix(prefix: string): Promise<string[]> {
    if (!this.ssm) return [];

    const parameters: string[] = [];
    let nextToken: string | undefined;

    do {
      const command = new GetParametersByPathCommand({
        Path: prefix,
        Recursive: true,
        NextToken: nextToken,
      });

      const result = await this.ssm.send(command);

      if (result.Parameters) {
        parameters.push(...result.Parameters.map(p => p.Name!).filter(Boolean));
      }

      nextToken = result.NextToken;
    } while (nextToken);

    return parameters;
  }

  /**
   * Delete parameters in batches
   */
  private async deleteParameters(parameterNames: string[]): Promise<void> {
    if (!this.ssm || parameterNames.length === 0) return;

    // Delete in batches of 10 (AWS limit)
    const batchSize = 10;
    for (let i = 0; i < parameterNames.length; i += batchSize) {
      const batch = parameterNames.slice(i, i + batchSize);
      
      try {
        const command = new DeleteParametersCommand({
          Names: batch,
        });
        await this.ssm.send(command);
      } catch (error) {
        console.warn(`[ssm-cleanup] Failed to delete parameter batch:`, batch, error);
      }
    }
  }

  /**
   * Cleanup all parameters (for development use)
   */
  async cleanupAllParameters(): Promise<void> {
    if (!this.ssm) return;

    const currentEnv = process.env.CDK_ENVIRONMENT;
    
    // Only allow in aggressive environments
    if (!currentEnv || !this.aggressiveEnvironments.includes(currentEnv)) {
      console.warn(`[ssm-cleanup] Full cleanup not allowed in environment: ${currentEnv}`);
      return;
    }

    console.log(`[ssm-cleanup] Performing full parameter cleanup for ${currentEnv}`);

    try {
      // List all parameters
      const allParameters = await this.listParametersByPrefix('/');
      
      if (allParameters.length > 0) {
        await this.deleteParameters(allParameters);
        console.log(`[ssm-cleanup] Deleted ${allParameters.length} parameters`);
      } else {
        console.log(`[ssm-cleanup] No parameters found to delete`);
      }
    } catch (error) {
      console.error(`[ssm-cleanup] Failed to perform full cleanup:`, error);
    }
  }

  /**
   * Cleanup plugin resources
   */
  async cleanup(): Promise<void> {
    // Unsubscribe from events
    if (this.eventBus) {
      this.eventBus.removeAllListeners(EventTypes['orchestrator:after:stack-destroy']);
      this.eventBus.removeAllListeners(EventTypes['plugin:error']);
    }
  }
}

// Export as default for easy importing
export default SSMCleanupPlugin;