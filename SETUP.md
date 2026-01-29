# inriver OCP Integration - Setup Guide

This guide will help you set up and deploy the inriver integration for Optimizely Connect Platform (OCP).

## Prerequisites

- Node.js 18+ and yarn installed
- OCP CLI installed (`npm install -g @zaiusinc/ocp-cli`)
- Access to an OCP account with developer permissions
- inriver PIM account with API access
- inriver API key and channel ID

## Configuration

### 1. inriver API Setup

Before deploying the app, gather the following from your inriver account:

- **API Key**: Generate from inriver Admin > API Keys
- **API Base URL**: Typically `https://api-{environment}.productmarketingcloud.com`
- **Channel ID**: The ID of the channel you want to sync from inriver

### 2. Field Mapping

The integration uses common inriver field type IDs. Update the field mappings in [src/lib/transformAssetToPayload.ts](src/lib/transformAssetToPayload.ts) to match your inriver data model:

```typescript
// Adjust these field type IDs to match your inriver setup
const sku = getFieldValue(entity, 'ProductNumber');      // Your SKU field
const name = getFieldValue(entity, 'ProductName');       // Your name field
const description = getFieldValue(entity, 'ProductDescription'); // Your description field
```

Common inriver field type IDs include:
- `ProductNumber`, `SKU`, `ItemNumber` - for SKU/part numbers
- `ProductName`, `DisplayName`, `Name` - for product names
- `ProductDescription`, `Description` - for descriptions
- `Price`, `ListPrice` - for pricing
- `Brand`, `Manufacturer` - for brand info

## Installation Steps

### 1. Install Dependencies

```bash
yarn install
```

### 2. Build the App

```bash
yarn build
```

### 3. Run Tests

```bash
yarn test
```

### 4. Validate the App

```bash
yarn validate
```

### 5. Get Your OCP Tracker ID

```bash
ocp accounts whoami
```

Note your account's tracker ID from the output.

### 6. Prepare for Publishing

```bash
ocp app prepare
```

### 7. Publish to Your OCP Directory

```bash
ocp directory publish inriver_connector@1.0.0-dev.1
```

### 8. Install to Your OCP Account

```bash
ocp directory install inriver_connector@1.0.0-dev.1 YOUR_TRACKER_ID
```

Replace `YOUR_TRACKER_ID` with your actual tracker ID.

## Configuration in OCP

After installation, configure the app in the OCP UI:

1. Navigate to **App Directory** in OCP
2. Find and open **inriver_connector**
3. Go to the **Settings** tab
4. Fill in the configuration:

### Authentication Section
- **API Key**: Your inriver API key (stored securely)
- **API Base URL**: Your inriver environment URL
- **Channel ID**: The inriver channel to sync from

### Sync Configuration Section
- **Entity Types to Sync**: Select which entity types to import:
  - Products
  - Items/SKUs
  - Channels
  - Resources (Media)

## Testing Locally

Use the OCP local testing tool to test your app before deploying:

```bash
ocp dev
```

This opens a web interface where you can:
- Preview the settings form
- Test functions with custom payloads
- Run jobs manually
- View detailed logs

## Usage

### Historical Import

Run a one-time historical import to sync all existing data from inriver:

1. Go to **Jobs** in the OCP UI
2. Find **Historical Import** job
3. Click **Run Job**
4. Monitor progress in the job execution logs

The job will:
- Paginate through all entities in the configured channel
- Transform inriver entities to OCP products
- Handle retries automatically on errors
- Send a notification when complete

### Nightly Sync

The nightly import runs automatically at midnight (configured via cron in app.yml):

```yaml
nightly_import:
  cron: 0 0 0 ? * *  # Runs at midnight daily
```

To modify the schedule, update the cron expression in [app.yml](app.yml).

### Webhook Integration

To receive real-time updates from inriver:

1. Get your function URL from OCP (in the Functions section)
2. Configure webhook in inriver:
   - Go to inriver Admin > Webhooks
   - Create new webhook
   - Set URL to your OCP function URL
   - Select entity types to monitor
   - Configure events (create, update, delete)

The webhook will process individual entity updates in real-time.

## Data Model

Products imported from inriver are stored in the `inriver_connector_products` object with these fields:

| Field | Type | Description |
|-------|------|-------------|
| product_id | string | inriver entity ID (primary key) |
| entity_type | string | Entity type (Product, Item, etc) |
| sku | string | Product SKU |
| product_name | string | Product name |
| description | string | Product description |
| price | number | Product price |
| brand | string | Brand name |
| category | string | Category |
| image_url | string | Primary image URL |
| channel_id | string | Associated channel |
| completeness | number | Data completeness score |
| last_modified | datetime | Last sync timestamp |

## Customization

### Adding Custom Fields

1. Add fields to [src/schema/inriver_connector_assets.yml](src/schema/inriver_connector_assets.yml)
2. Update the transform function in [src/lib/transformAssetToPayload.ts](src/lib/transformAssetToPayload.ts)
3. Rebuild and redeploy

### Handling Linked Entities

To fetch related entities (e.g., product images):

```typescript
// In your job or function
const links = await this.inriverClient.getEntityLinks(entityId, 'ProductImage');
for (const link of links) {
  const resource = await this.inriverClient.getEntity(link.targetEntityId);
  const imageUrl = await this.inriverClient.getResourceUrl(link.targetEntityId);
  // Use imageUrl in your payload
}
```

## Troubleshooting

### Common Issues

**Authentication Errors**
- Verify your API key is correct
- Check that the API key has proper permissions in inriver
- Ensure the API URL matches your inriver environment

**No Data Syncing**
- Verify the channel ID exists in inriver
- Check that the channel contains the entity types you selected
- Review job logs for specific errors

**Field Mapping Issues**
- Use inriver API documentation to find correct field type IDs
- Test field values using the inriver REST API explorer
- Update field mappings in transformAssetToPayload.ts

### Viewing Logs

Access detailed logs in OCP:
1. Go to **Jobs** or **Functions** in OCP UI
2. Click on execution history
3. View detailed logs for debugging

### Testing API Connectivity

Use the inriver Swagger UI to test API endpoints:
```
https://api-{environment}.productmarketingcloud.com/swagger/index.html
```

## Architecture

```
┌─────────────┐
│   inriver   │
│     PIM     │
└──────┬──────┘
       │
       │ API Calls (REST)
       │
       ▼
┌─────────────────────┐
│  InriverClient.ts   │
│  (API Wrapper)      │
└──────┬──────────────┘
       │
       │ Entities
       │
       ▼
┌────────────────────────┐
│ transformAssetToPayload│
│  (Data Transformer)    │
└──────┬─────────────────┘
       │
       │ OCP Payloads
       │
       ▼
┌─────────────────┐
│  OCP Objects    │
│  (inriver_      │
│   connector_    │
│   products)     │
└─────────────────┘
```

## Support

For issues or questions:
- Review [OCP Documentation](https://docs.developers.optimizely.com/optimizely-connect-platform/docs)
- Check [inriver REST API Documentation](https://api-test1a-euw.productmarketingcloud.com/swagger/index.html)
- Contact: teemu.eronne@kraftvaerk.com

## Next Steps

1. **Extend Entity Types**: Add support for Items, Channels, or Resources
2. **Add Media Sync**: Fetch and store product images from inriver Resources
3. **Implement Delta Sync**: Track last modified timestamps for incremental updates
4. **Add Data Validation**: Implement completeness checks and data quality rules
5. **Create Audiences**: Use synced product data to create audiences in OCP
