# inriver OCP Integration - Quick Reference

## ✅ Implementation Complete

Your inriver integration for Optimizely Connect Platform is ready to deploy!

## What's Been Built

### 📋 Data Models
- **InriverEntity** - Core data structure for all inriver entities
- **InriverProduct** - Product-specific entity type
- **InriverItem** - Item/SKU entity type
- **InriverResource** - Media/resource entity type
- **InriverChannel** - Channel configuration

### 🔌 API Integration
- **InriverClient** - Full REST API client with methods for:
  - Get channel entities with pagination
  - Get individual entities by ID
  - Get resource URLs for media
  - Get channel information
  - Get entity links (related entities)

### 🔄 Data Synchronization
1. **Historical Import Job** - One-time full sync of all products
2. **Nightly Import Job** - Scheduled incremental sync (midnight)
3. **Webhook Function** - Real-time updates from inriver

### 📊 OCP Object Schema
**inriver_connector_products** with fields:
- product_id (primary)
- entity_type
- sku
- product_name
- description
- price
- brand
- category
- image_url
- channel_id
- completeness
- last_modified

## Next Steps

### 1. Deploy to OCP

```bash
# Validate
yarn validate

# Prepare for publishing
ocp app prepare

# Publish to your directory
ocp directory publish inriver_connector@1.0.0-dev.1

# Install to your account
ocp directory install inriver_connector@1.0.0-dev.1 YOUR_TRACKER_ID
```

### 2. Configure in OCP UI

After installation:
1. Go to App Directory > inriver_connector
2. Click Settings tab
3. Enter:
   - **API Key**: Your inriver API key
   - **API Base URL**: Your inriver environment URL
   - **Channel ID**: Channel to sync from
   - **Entity Types**: Select Product (and optionally Item, Channel, Resource)

### 3. Run Initial Import

1. Navigate to Jobs in OCP UI
2. Find "Historical Import"
3. Click "Run Job"
4. Monitor execution in logs

### 4. Test Webhook (Optional)

1. Get function URL from OCP (Functions > handle_incoming_object)
2. Configure in inriver:
   - Admin > Webhooks
   - Add new webhook
   - Set URL to OCP function URL
   - Select entity types and events

## Customization Guide

### Adjust Field Mappings

Edit [src/lib/transformAssetToPayload.ts](src/lib/transformAssetToPayload.ts):

```typescript
// Update these field type IDs to match your inriver model
const sku = getFieldValue(entity, 'YOUR_SKU_FIELD');
const name = getFieldValue(entity, 'YOUR_NAME_FIELD');
```

Common inriver field types:
- ProductNumber, SKU, ItemNumber
- ProductName, DisplayName, Name
- ProductDescription, Description
- Price, ListPrice, MSRP
- Brand, Manufacturer
- Category, ProductCategory

### Add Custom Fields

1. Update schema: [src/schema/inriver_connector_products.yml](src/schema/inriver_connector_products.yml)
2. Update transform: [src/lib/transformAssetToPayload.ts](src/lib/transformAssetToPayload.ts)
3. Rebuild: `yarn build`

### Handle Product Images

Example code to fetch linked media:

```typescript
// In your job
const links = await this.inriverClient.getEntityLinks(entity.id, 'ProductImage');
if (links.length > 0) {
  const imageUrl = await this.inriverClient.getResourceUrl(links[0].targetEntityId);
  // Pass imageUrl to transform
}
```

### Change Sync Schedule

Edit [app.yml](app.yml):

```yaml
nightly_import:
  cron: 0 0 2 ? * *  # 2 AM daily
  # Or: 0 0 */6 ? * * # Every 6 hours
```

## File Structure

```
src/
├── data/
│   └── IncomingAssets.ts          # inriver entity interfaces
├── functions/
│   └── HandleIncomingObject.ts    # Webhook handler
├── jobs/
│   ├── HistoricalImport.ts        # Full sync job
│   └── NightlyImport.ts           # Incremental sync
├── lib/
│   ├── inriverClient.ts           # API client
│   └── transformAssetToPayload.ts # Data transformer
├── schema/
│   └── inriver_connector_products.yml  # OCP object definition
forms/
└── settings.yml                   # Configuration UI
```

## Testing

```bash
# Run all tests
yarn test

# Build
yarn build

# Lint
yarn lint

# Full validation
yarn validate

# Local testing UI
ocp dev
```

## Troubleshooting

### Authentication Errors
- Verify API key in OCP settings
- Check API URL matches your environment
- Ensure API key has required permissions

### No Data Syncing
- Verify channel ID exists in inriver
- Check entity types are configured
- Review job execution logs in OCP

### Field Mapping Issues
- Use inriver Swagger UI to inspect API responses
- Update field type IDs in transformAssetToPayload.ts
- Test with single entity first

## Resources

- [OCP Documentation](https://docs.developers.optimizely.com/optimizely-connect-platform/docs)
- [inriver REST API](https://api-test1a-euw.productmarketingcloud.com/swagger/index.html)
- [SETUP.md](SETUP.md) - Detailed setup guide
- Support: teemu.eronne@kraftvaerk.com

## Version Info

- App ID: `inriver_connector`
- Version: `1.0.0-dev.1`
- Runtime: Node.js 22
- OCP SDK: 3.3.2

---

**Status**: ✅ Ready for deployment
**Build**: ✅ Passing
**Tests**: ✅ 6/6 passing
**Validation**: ✅ Passed
