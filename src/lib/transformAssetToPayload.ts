import { ObjectPayload } from '@zaiusinc/node-sdk';
import { InriverEntity, InriverEntityData } from '../data/IncomingAssets';

/**
 * Helper to extract field value from inriver entity
 * @param entity The inriver entity
 * @param fieldTypeId The field type ID to extract
 * @param languageId Optional language ID for localized fields
 */
export function getFieldValue(entity: InriverEntity, fieldTypeId: string, languageId?: string): any {
  const field = entity.fieldValues.find((f) => {
    const matchesField = f.fieldTypeId === fieldTypeId;
    const matchesLanguage = !languageId || f.languageId === languageId;
    return matchesField && matchesLanguage;
  });
  return field?.value || null;
}

/**
 * Transform inriver entity data (from fetchdata endpoint) into OCP product payload
 * @param entityData The inriver entity data with summary
 * @param channelId Optional channel ID override
 */
export function transformEntityDataToPayload(
  entityData: InriverEntityData,
  channelId?: string
): ObjectPayload {
  const summary = entityData.summary;

  // Convert inriver date string to Unix timestamp
  const lastModified = summary.modifiedDate
    ? new Date(summary.modifiedDate).getTime()
    : Date.now();

  const payload: ObjectPayload = {
    product_id: summary.id.toString(),
    entity_type: summary.entityTypeId,
    sku: summary.id.toString(), // Use actual SKU field when available from fieldValues
    product_name: summary.displayName || `Product ${summary.id}`,
    last_modified: lastModified,
  };

  // Only add optional fields if they have meaningful values
  if (summary.displayDescription && summary.displayDescription.trim()) {
    payload.description = summary.displayDescription;
  }

  if (summary.resourceUrl) {
    payload.image_url = summary.resourceUrl;
  }

  if (channelId) {
    payload.channel_id = channelId;
  }

  if (summary.completeness !== undefined && summary.completeness !== null) {
    payload.completeness = summary.completeness;
  }

  return payload;
}

/**
 * Transform inriver entity into OCP product payload
 * @param entity The inriver entity to transform
 * @param imageUrl Optional image URL from linked resource
 * @param channelId Optional channel ID override
 */
export function transformProductToPayload(
  entity: InriverEntity,
  imageUrl?: string,
  channelId?: string
): ObjectPayload {
  // Common inriver field type IDs - adjust based on your inriver model
  const sku = getFieldValue(entity, 'ProductNumber')
    || getFieldValue(entity, 'SKU')
    || getFieldValue(entity, 'ItemNumber');

  const name = getFieldValue(entity, 'ProductName')
    || getFieldValue(entity, 'DisplayName')
    || getFieldValue(entity, 'Name');

  const description = getFieldValue(entity, 'ProductDescription')
    || getFieldValue(entity, 'Description')
    || getFieldValue(entity, 'ShortDescription');

  return {
    product_id: entity.id.toString(),
    entity_type: entity.entityTypeId,
    sku,
    product_name: name,
    description,
    price: getFieldValue(entity, 'Price') || getFieldValue(entity, 'ListPrice'),
    brand: getFieldValue(entity, 'Brand') || getFieldValue(entity, 'Manufacturer'),
    category: getFieldValue(entity, 'Category') || getFieldValue(entity, 'ProductCategory'),
    ...(imageUrl && { image_url: imageUrl }),
    ...(channelId && { channel_id: channelId }),
    ...(entity.completeness !== undefined && { completeness: entity.completeness }),
    last_modified: new Date().toISOString(),
  };
}

