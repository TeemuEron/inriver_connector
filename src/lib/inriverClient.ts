import { logger, storage } from '@zaiusinc/app-sdk';
import {
  InriverEntity,
  InriverChannel,
  InriverEntityData,
  InriverEntityListResponse,
} from '../data/IncomingAssets';

export interface InriverConfig {
  apiKey: string;
  apiUrl: string;
  channelId: string;
}

export class InriverClient {
  private config: InriverConfig;

  public constructor(config: InriverConfig) {
    this.config = config;
  }

  public static async fromStorage(): Promise<InriverClient> {
    const authSettings = await storage.settings.get('authentication');

    return new InriverClient({
      apiKey: authSettings.api_key as string,
      apiUrl: authSettings.api_url as string,
      channelId: authSettings.channel_id as string,
    });
  }

  /**
   * Get entities from a channel with pagination
   * Uses two-step process: first get entity IDs, then fetch entity data in batches
   * @param entityTypeId The type of entity to retrieve (Product, Item, Channel, Resource)
   * @param pageSize Number of entities per page
   * @param page Page number (0-indexed)
   */
  public async getChannelEntities(
    entityTypeId: string,
    pageSize: number = 100,
    page: number = 0
  ): Promise<InriverEntityData[]> {
    // Step 1: Get entity IDs for the entity type from channel
    const entityListUrl =
      `${this.config.apiUrl}/api/v1.0.0/channels/${this.config.channelId}/entitylist?entityTypeId=${entityTypeId}`;

    logger.info(`Fetching ${entityTypeId} entity IDs from channel ${this.config.channelId}`);

    const listResponse = await fetch(entityListUrl, {
      headers: {
        'X-inRiver-APIKey': this.config.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      throw new Error(`inriver API error: ${listResponse.status} ${errorText}`);
    }

    const entityList = (await listResponse.json()) as InriverEntityListResponse;

    if (!entityList.entityIds || entityList.entityIds.length === 0) {
      return [];
    }

    // Step 2: Paginate the entity IDs
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedIds = entityList.entityIds.slice(startIndex, endIndex);

    if (paginatedIds.length === 0) {
      return [];
    }

    // Step 3: Fetch entity data in batch
    return await this.fetchEntitiesData(paginatedIds);
  }

  /**
   * Fetch entity data in batch using fetchdata endpoint
   * @param entityIds Array of entity IDs to fetch
   */
  public async fetchEntitiesData(entityIds: number[]): Promise<InriverEntityData[]> {
    const url = `${this.config.apiUrl}/api/v1.0.1/entities:fetchdata`;

    logger.info(`Fetching data for ${entityIds.length} entities`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-inRiver-APIKey': this.config.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityIds,
        objects: 'EntitySummary',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`inriver API error: ${response.status} ${errorText}`);
    }

    return (await response.json()) as InriverEntityData[];
  }

  /**
   * Get a specific entity by ID
   * @param entityId The unique identifier of the entity
   */
  public async getEntity(entityId: number): Promise<InriverEntity> {
    const url = `${this.config.apiUrl}/api/v1.0.0/entities/${entityId}`;

    logger.info(`Fetching entity ${entityId}`);

    const response = await fetch(url, {
      headers: {
        'X-inRiver-APIKey': this.config.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`inriver API error: ${response.status} ${errorText}`);
    }

    return (await response.json()) as InriverEntity;
  }

  /**
   * Get the URL for a resource (media file)
   * @param resourceId The ID of the resource entity
   */
  public async getResourceUrl(resourceId: number): Promise<string | null> {
    const url = `${this.config.apiUrl}/api/v1.0.0/entities/${resourceId}/resourceurl`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-inRiver-APIKey': this.config.apiKey,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      logger.warn(`Could not fetch resource URL for ${resourceId}`, error);
    }

    return null;
  }

  /**
   * Get channel information
   * @param channelId Optional channel ID, defaults to configured channel
   */
  public async getChannel(channelId?: string): Promise<InriverChannel> {
    const id = channelId || this.config.channelId;
    const url = `${this.config.apiUrl}/api/v1.0.0/channels/${id}`;

    const response = await fetch(url, {
      headers: {
        'X-inRiver-APIKey': this.config.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`inriver API error: ${response.status} ${errorText}`);
    }

    return (await response.json()) as InriverChannel;
  }

  /**
   * Get links for an entity (related entities)
   * @param entityId The entity ID
   * @param linkTypeId Optional link type filter
   */
  public async getEntityLinks(entityId: number, linkTypeId?: string): Promise<any[]> {
    let url = `${this.config.apiUrl}/api/v1.0.0/entities/${entityId}/links`;
    if (linkTypeId) {
      url += `?linkTypeId=${linkTypeId}`;
    }

    const response = await fetch(url, {
      headers: {
        'X-inRiver-APIKey': this.config.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`inriver API error: ${response.status} ${errorText}`);
    }

    return (await response.json()) as any[];
  }
}
