import { describe, it, expect, vi } from 'vitest';
import { odp } from '@zaiusinc/node-sdk';
import { HandleIncomingObject } from './HandleIncomingObject';
import { InriverEntity } from '../data/IncomingAssets';

vi.mock('@zaiusinc/node-sdk');

const mockInriverEntity: InriverEntity = {
  id: 12345,
  entityTypeId: 'Product',
  fieldValues: [
    { fieldTypeId: 'ProductNumber', value: 'SKU-123' },
    { fieldTypeId: 'ProductName', value: 'Test Product' },
    { fieldTypeId: 'Price', value: 99.99 },
  ],
  completeness: 85,
};

const mockRequest = {
  params: {},
  bodyJSON: mockInriverEntity,
};

describe('HandleIncomingObject', () => {
  it('processes an inriver entity and creates product in OCP', async () => {
    const handler = new HandleIncomingObject(mockRequest as any);
    const response = await handler.perform();

    expect(response.status).toBe(200);
    expect(odp.object).toHaveBeenCalledWith(
      'inriver_connector_products',
      expect.objectContaining({
        product_id: '12345',
        entity_type: 'Product',
        sku: 'SKU-123',
        product_name: 'Test Product',
      })
    );
  });

  it('returns 400 for invalid entity data', async () => {
    const invalidRequest = { params: {}, bodyJSON: {} };
    const handler = new HandleIncomingObject(invalidRequest as any);
    const response = await handler.perform();

    expect(response.status).toBe(400);
  });
});
