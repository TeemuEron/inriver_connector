import {Job, JobStatus, logger, notifications, storage, ValueHash} from '@zaiusinc/app-sdk';
import { odp } from '@zaiusinc/node-sdk';
import { InriverClient } from '../lib/inriverClient';
import { InriverEntityData } from '../data/IncomingAssets';
import { transformEntityDataToPayload } from '../lib/transformAssetToPayload';

interface NightlyImportJobStatus extends JobStatus {
  state: {
    currentPage: number;
    totalImported: number;
    currentEntityTypeIndex: number;
    entityTypes: string[];
    retries: number;
  };
}

/**
 * Performs a nightly import of incremental changes from inriver
 * Runs at midnight every night to sync updated products
 */
export class NightlyImport extends Job {
  private inriverClient!: InriverClient;
  private channelId!: string;

  /**
   * Prepares to run a job. Prepare is called at the start of a job
   * and again only if the job was interrupted and is being resumed.
   * Use this function to read secrets and establish connections to simplify the job loop (perform).
   * @param params a hash if params were supplied to the job run, otherwise an empty hash
   * @param status if job was interrupted and should continue from the last known state
   */
  public async prepare(params: ValueHash, status?: NightlyImportJobStatus): Promise<NightlyImportJobStatus> {
    logger.info('Preparing inriver Nightly Import Job with params:', params, 'and status', status);

    // Initialize inriver client
    this.inriverClient = await InriverClient.fromStorage();

    // Get configuration
    const authSettings = await storage.settings.get('authentication');
    const syncSettings = await storage.settings.get('sync_options');
    this.channelId = authSettings.channel_id as string;
    const entityTypes = (syncSettings.entity_types as string[]) || ['Product'];

    logger.info(`Starting nightly sync for entity types: ${entityTypes.join(', ')}`);

    if (status) {
      return status;
    }

    return {
      state: {
        currentPage: 0,
        totalImported: 0,
        currentEntityTypeIndex: 0,
        entityTypes,
        retries: 0,
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
  public async perform(status: NightlyImportJobStatus): Promise<NightlyImportJobStatus> {
    const state = status.state;
    const pageSize = 100;
    let encounteredError = false;

    // Check if we've processed all entity types
    if (state.currentEntityTypeIndex >= state.entityTypes.length) {
      await notifications.success(
        'inriver Nightly Import',
        'Completed Nightly Sync',
        `Synced ${state.totalImported} entities from inriver.`
      );
      status.complete = true;
      return status;
    }

    const currentEntityType = state.entityTypes[state.currentEntityTypeIndex];

    try {
      logger.info(`Syncing ${currentEntityType} page ${state.currentPage}`);

      // Fetch entities from inriver
      const entities: InriverEntityData[] = await this.inriverClient.getChannelEntities(
        currentEntityType,
        pageSize,
        state.currentPage
      );

      if (entities && entities.length > 0) {
        // Transform and send to OCP
        const payloads = entities.map((entityData) =>
          transformEntityDataToPayload(entityData, this.channelId)
        );

        await odp.object('inriver_connector_products', payloads);

        state.totalImported += entities.length;
        state.currentPage++;
        state.retries = 0;

        logger.info(`Synced ${entities.length} ${currentEntityType} entities`);
      } else {
        // Move to next entity type
        logger.info(`Completed ${currentEntityType}. Moving to next entity type.`);
        state.currentEntityTypeIndex++;
        state.currentPage = 0;
      }
    } catch (e: any) {
      logger.error('Nightly import error:', e);
      encounteredError = true;
    }

    // Handle errors with retry logic
    if (encounteredError) {
      if (state.retries >= 3) {
        await notifications.error(
          'inriver Nightly Import',
          'Nightly sync failed',
          `Maximum retries exceeded. Synced ${state.totalImported} entities before failure.`
        );
        status.complete = true;
      } else {
        state.retries++;
        await this.sleep(state.retries * 3000, { interruptible: true });
      }
    }

    return status;
  }
}
