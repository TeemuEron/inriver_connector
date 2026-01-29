/**
 * inriver Entity Response
 */
export interface InriverEntity {
  id: number;
  entityTypeId: string;
  fieldValues: InriverFieldValue[];
  completeness?: number;
  segmentId?: number;
}

export interface InriverFieldValue {
  fieldTypeId: string;
  value: any;
  data?: any;
  languageId?: string;
}

/**
 * inriver Product specific structure
 */
export interface InriverProduct extends InriverEntity {
  entityTypeId: 'Product';
}

/**
 * inriver Item/SKU specific structure
 */
export interface InriverItem extends InriverEntity {
  entityTypeId: 'Item';
}

/**
 * inriver Resource (Media) structure
 */
export interface InriverResource extends InriverEntity {
  entityTypeId: 'Resource';
  resourceFileId?: number;
  resourceUrl?: string;
}

/**
 * Channel structure from inriver
 */
export interface InriverChannel {
  id: number;
  displayName: string;
  entityTypeIds: string[];
}

/**
 * Entity summary from fetchdata endpoint
 */
export interface InriverEntitySummary {
  id: number;
  displayName: string;
  displayDescription: string;
  version: string;
  lockedBy: string | null;
  createdBy: string;
  createdDate: string;
  formattedCreatedDate: string;
  modifiedBy: string;
  modifiedDate: string;
  formattedModifiedDate: string;
  resourceId: number | null;
  resourceUrl: string | null;
  entityTypeId: string;
  entityTypeDisplayName: string;
  completeness: number;
  fieldSetId: string | null;
  fieldSetName: string | null;
  segmentId: number;
  segmentName: string | null;
}

/**
 * Response from fetchdata endpoint
 */
export interface InriverEntityData {
  entityId: number;
  summary: InriverEntitySummary;
}

/**
 * Response from channel entitylist endpoint
 */
export interface InriverEntityListResponse {
  count: number;
  entityIds: number[];
}

