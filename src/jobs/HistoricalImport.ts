import {
  Job,
  JobStatus,
  logger,
  notifications,
  storage,
  ValueHash,
} from '@zaiusinc/app-sdk';
import { odp } from '@zaiusinc/node-sdk';
import { InriverEntityData } from '../data/IncomingAssets';
import { InriverClient } from '../lib/inriverClient';
import { transformEntityDataToPayload } from '../lib/transformAssetToPayload';

interface HistoricalImportJobStatus extends JobStatus {
  state: {
    currentPage: number;
    totalImported: number;
    currentEntityTypeIndex: number;
    entityTypes: string[];
    retries: number;
  };
}

/**
 * Historical import job for inriver entities
 * Fetches products and other entities from inriver channels and loads them into OCP
 * Includes pagination, backoff and retry logic
 */
export class HistoricalImport extends Job {
  private inriverClient!: InriverClient;
  private channelId!: string;

  /**
   * Prepares to run a job. Prepare is called at the start of a job
   * and again only if the job was interrupted and is being resumed.
   * Use this function to read secrets and establish connections to simplify the job loop (perform).
   * @param params a hash if params were supplied to the job run, otherwise an empty hash
   * @param status if job was interrupted and should continue from the last known state
   */
  public async prepare(
    params: ValueHash,
    status?: HistoricalImportJobStatus
  ): Promise<HistoricalImportJobStatus> {
    logger.info(
      'Preparing inriver Historical Import Job with params:',
      params,
      'and status',
      status
    );

    // Initialize inriver client from storage
    this.inriverClient = await InriverClient.fromStorage();

    // Get configuration from settings
    const authSettings = await storage.settings.get('authentication');
    const syncSettings = await storage.settings.get('sync_options');
    this.channelId = authSettings.channel_id as string;
    const entityTypes = (syncSettings.entity_types as string[]) || ['Product'];

    logger.info(`Starting import for entity types: ${entityTypes.join(', ')}`);

    if (status) {
      // if we resuming, we will be provided the last state where we left off
      return status;
    }

    return {
      state: {
        currentPage: 0,
        totalImported: 0,
        currentEntityTypeIndex: 0,
        entityTypes,
        retries: 0
      },
      complete: false,
    };
  }

  /**
   * Performs a unit of work. Jobs should perform a small unit of work and then return the current state.
   * Perform is called in a loop where the previously returned state will be given to the next iteration.
   * Iteration will continue until the returned state.complete is set to true or the job is interrupted.
   * @param status last known job state and status
   * @returns The current JobStatus/state that can be used to perform the next iteration or resume a job if interrupted.
   */
  public async perform(
    status: HistoricalImportJobStatus
  ): Promise<HistoricalImportJobStatus> {
    const state = status.state;
    const pageSize = 100;
    let encounteredError = false;

    // Check if we've processed all entity types
    if (state.currentEntityTypeIndex >= state.entityTypes.length) {
      await notifications.success(
        'inriver Historical Import',
        'Completed Historical Import',
        `Imported ${state.totalImported} total entities from inriver across ${state.entityTypes.length} entity types.`
      );
      status.complete = true;
      return status;
    }

    const currentEntityType = state.entityTypes[state.currentEntityTypeIndex];

    try {
      logger.info(`Fetching ${currentEntityType} page ${state.currentPage} (${state.totalImported} imported so far)`);

      // Fetch entities from inriver API
      const entities: InriverEntityData[] = await this.inriverClient.getChannelEntities(
        currentEntityType,
        pageSize,
        state.currentPage
      );

      if (entities && entities.length > 0) {
        logger.info(`Received ${entities.length} ${currentEntityType} entities`);

        // Transform entities to OCP payloads
        const payloads = entities.map((entityData) =>
          transformEntityDataToPayload(entityData, this.channelId)
        );

        // Debug: Log first payload to see structure
        logger.info('Sample payload:', JSON.stringify(payloads[0], null, 2));

        // Send batch to OCP
        // For local testing, map to standard products object
        const isLocalTesting = process.env.NODE_ENV !== 'production';
        logger.info(`NODE_ENV: ${process.env.NODE_ENV}, isLocalTesting: ${isLocalTesting}`);

        if (isLocalTesting) {
          // Local testing: just log the data, don't write to OCP
          logger.info(`[LOCAL TEST MODE] Would send ${payloads.length} records to OCP`);
          logger.info('[LOCAL TEST MODE] Sample records:', JSON.stringify(payloads.slice(0, 2), null, 2));
        } else {
          // Production: use custom object
          try {
            await odp.object('inriver_connector_products', payloads);
            logger.info(`Successfully sent ${payloads.length} records to OCP`);
          } catch (error: any) {
            logger.error('OCP write error:', error.message);
            logger.error('Error details:', JSON.stringify(error, null, 2));
            throw error;
          }
        }

        // Update state for next iteration
        state.totalImported += entities.length;
        state.currentPage++;
        state.retries = 0;

        logger.info(
          `Successfully imported page ${state.currentPage} of ${currentEntityType}, total: ${state.totalImported}`
        );
      } else {
        // No more data for this entity type, move to next
        logger.info(`Completed ${currentEntityType} import. Moving to next entity type.`);
        state.currentEntityTypeIndex++;
        state.currentPage = 0; // Reset page for next entity type
      }
    } catch (e: any) {
      // Log all handled errors for future investigation
      logger.error('Historical import error:', e);
      encounteredError = true;
    }

    // If we encountered an error, backoff and retry up to 5 times
    if (encounteredError) {
      if (state.retries >= 5) {
        // Notify the customer there was a problem with the import
        await notifications.error(
          'inriver Historical Import',
          'Failed to complete historical import',
          `Maximum retries exceeded. Imported ${state.totalImported} entities before failure.`
        );
        status.complete = true;
      } else {
        state.retries++;
        const backoffMs = state.retries * 5000;
        logger.info(`Retrying in ${backoffMs}ms (attempt ${state.retries}/5)`);
        // Use interruptible sleep so job can be safely evicted during backoff
        await this.sleep(backoffMs, { interruptible: true });
      }
    }

    // Our state has been updated inside status so we know where to resume
    return status;
  }
}

