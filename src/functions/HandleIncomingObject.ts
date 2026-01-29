import { logger, Function, Response } from '@zaiusinc/app-sdk';
import { odp } from '@zaiusinc/node-sdk';
import { InriverEntity } from '../data/IncomingAssets';
import { transformProductToPayload } from '../lib/transformAssetToPayload';

/**
 * Handle incoming webhook from inriver
 * This function can be called when inriver sends entity updates via webhook
 * Configure webhook in inriver to point to this function's URL
 */
export class HandleIncomingObject extends Function {
  /**
   * Handle a request to the handle_incoming_object function URL
   * this.request contains the request information
   * @returns Response as the HTTP response
   */
  public async perform(): Promise<Response> {
    try {
      // Parse the incoming inriver entity from request body
      const entity = this.request.bodyJSON as InriverEntity;

      // Validate we have required data
      if (!entity || !entity.id) {
        logger.warn('Invalid entity data received', entity);
        return new Response(400, 'Missing required entity data');
      }

      logger.info(`Processing inriver entity ${entity.id} of type ${entity.entityTypeId}`);

      // Transform inriver entity into OCP payload
      const payload = transformProductToPayload(entity);

      // Send to OCP
      await odp.object('inriver_connector_products', payload);

      logger.info(`Successfully processed entity ${entity.id}`);

      // Return success response
      return new Response(200, { success: true, entityId: entity.id });

    } catch (e: any) {
      logger.error('Error processing inriver webhook:', e);
      return new Response(500, `An unexpected error occurred: ${e.message}`);
    }
  }
}

