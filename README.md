# inriver OCP Connector

An Optimizely Connect Platform (OCP) integration that syncs products and other entities from inriver PIM.

## Features

- **Full Historical Import** - One-time bulk import of all products from inriver channels
- **Nightly Incremental Sync** - Scheduled automatic updates (configurable)
- **Real-time Webhooks** - Instant updates when products change in inriver
- **Multi-Entity Support** - Products, Items/SKUs, Channels, and Resources (Media)
- **Pagination & Retry Logic** - Handles large datasets and API instability
- **Configurable Field Mapping** - Easy customization for your inriver data model

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for a complete quick reference guide.

### Installation

```bash
yarn install
yarn build
yarn validate
```

### Deployment

```bash
# Prepare the app
ocp app prepare

# Publish to OCP directory
ocp directory publish inriver_connector@1.0.0-dev.1

# Install to your account
ocp directory install inriver_connector@1.0.0-dev.1 YOUR_TRACKER_ID
```

### Configuration

After installation in OCP:
1. Navigate to App Directory > inriver_connector > Settings
2. Configure:
   - **API Key**: Your inriver REST API key
   - **API Base URL**: Your inriver environment URL (e.g., `https://api-test1a-euw.productmarketingcloud.com`)
   - **Channel ID**: The inriver channel to sync from
   - **Entity Types**: Select which types to import (Products, Items, etc.)

## Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup and configuration guide
- **[QUICKSTART.md](QUICKSTART.md)** - Quick reference for common tasks
- [OCP Documentation](https://docs.developers.optimizely.com/optimizely-connect-platform/docs)
- [inriver REST API](https://api-test1a-euw.productmarketingcloud.com/swagger/index.html)

## Architecture

```
inriver PIM → InriverClient → Transform → OCP Objects
     ↓
  Webhooks → HandleIncomingObject → Real-time updates
     ↓
  Scheduled Jobs → Historical/Nightly Import → Bulk sync
```

## Build and Test

### Run Tests

```bash
yarn test
```

### Local Development

```bash
# Start local testing UI
ocp dev

# Build
yarn build

# Lint
yarn lint

# Full validation
yarn validate
```

## Components

### Jobs
- **HistoricalImport** - Full sync of all entities from inriver
- **NightlyImport** - Scheduled incremental sync (runs at midnight)

### Functions  
- **HandleIncomingObject** - Webhook endpoint for real-time updates

### Libraries
- **InriverClient** - REST API client for inriver
- **transformProductToPayload** - Data transformation utilities

### Schema
- **inriver_connector_products** - OCP object for storing product data

## Customization

### Field Mappings

Edit [src/lib/transformAssetToPayload.ts](src/lib/transformAssetToPayload.ts) to adjust field mappings:

```typescript
const sku = getFieldValue(entity, 'YOUR_SKU_FIELD');
const name = getFieldValue(entity, 'YOUR_NAME_FIELD');
```

### Adding Fields

1. Update schema: [src/schema/inriver_connector_products.yml](src/schema/inriver_connector_products.yml)
2. Update transform: [src/lib/transformAssetToPayload.ts](src/lib/transformAssetToPayload.ts)
3. Rebuild: `yarn build`

### Sync Schedule

Modify the cron expression in [app.yml](app.yml):

```yaml
nightly_import:
  cron: 0 0 0 ? * *  # Midnight daily
```

## Support

For questions or issues:
- Email: teemu.eronne@kraftvaerk.com
- See [OCP Documentation](https://docs.developers.optimizely.com/optimizely-connect-platform/docs)

## License

UNLICENSED
"# inriver_connector" 
"# inriver_connector" 
