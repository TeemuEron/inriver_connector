import { describe, it, expect } from 'vitest';
import { transformProductToPayload, getFieldValue, transformEntityDataToPayload } from './transformAssetToPayload';
import { InriverEntity, InriverEntityData } from '../data/IncomingAssets';

const mockInriverEntity: InriverEntity = {
  id: 12345,
  entityTypeId: 'Product',
  fieldValues: [
    { fieldTypeId: 'ProductNumber', value: 'SKU-123' },
    { fieldTypeId: 'ProductName', value: 'Test Product' },
    { fieldTypeId: 'ProductDescription', value: 'A test product description' },
    { fieldTypeId: 'Price', value: 99.99 },
    { fieldTypeId: 'Brand', value: 'TestBrand' },
  ],
  completeness: 85,
};

const mockEntityData: InriverEntityData = {
  entityId: 12345,
  summary: {
    id: 12345,
    displayName: 'Test Product',
    displayDescription: 'Test description',
    version: '1',
    lockedBy: null,
    createdBy: 'test@example.com',
    createdDate: '2023-06-28T09:31:00.0000000',
    formattedCreatedDate: '6/28/2023 9:31:00 AM',
    modifiedBy: 'test@example.com',
    modifiedDate: '2023-06-28T10:00:00.0000000',
    formattedModifiedDate: '6/28/2023 10:00:00 AM',
    resourceId: null,
    resourceUrl: null,
    entityTypeId: 'Product',
    entityTypeDisplayName: 'Product',
    completeness: 100,
    fieldSetId: null,
    fieldSetName: null,
    segmentId: 0,
    segmentName: null,
  },
};

describe('transformEntityDataToPayload', () => {
  it('transforms inriver entity data to OCP payload', () => {
    const payload = transformEntityDataToPayload(mockEntityData);

    expect(payload).toMatchObject({
      product_id: '12345',
      entity_type: 'Product',
      product_name: 'Test Product',
      description: 'Test description',
      completeness: 100,
    });
    // Verify timestamp is a number (timezone-independent check)
    expect(typeof payload.last_modified).toBe('number');
    expect(payload.last_modified).toBeGreaterThan(0);
  });

  it('includes channel ID when provided', () => {
    const payload = transformEntityDataToPayload(mockEntityData, '6614');

    expect(payload.channel_id).toBe('6614');
  });
});

describe('transformProductToPayload', () => {
  it('transforms an inriver entity to an OCP product payload', () => {
    const payload = transformProductToPayload(mockInriverEntity);

    expect(payload).toMatchObject({
      product_id: '12345',
      entity_type: 'Product',
      sku: 'SKU-123',
      product_name: 'Test Product',
      description: 'A test product description',
      price: 99.99,
      brand: 'TestBrand',
      completeness: 85,
    });
    expect(payload.last_modified).toBeDefined();
  });

  it('includes optional image URL and channel ID when provided', () => {
    const payload = transformProductToPayload(
      mockInriverEntity,
      'https://example.com/image.jpg',
      'channel-123'
    );

    expect(payload.image_url).toBe('https://example.com/image.jpg');
    expect(payload.channel_id).toBe('channel-123');
  });
});

describe('getFieldValue', () => {
  it('extracts field value by fieldTypeId', () => {
    const value = getFieldValue(mockInriverEntity, 'ProductName');
    expect(value).toBe('Test Product');
  });

  it('returns null for non-existent field', () => {
    const value = getFieldValue(mockInriverEntity, 'NonExistentField');
    expect(value).toBeNull();
  });
});
