import { QBOSyncProvider } from './qbo'

/**
 * QuickBooksSyncService is a re-export and extension of QBOSyncProvider to maintain
 * backward compatibility with imports referencing 'quickbooks.ts' or 'QuickBooksSyncService'.
 */
export class QuickBooksSyncService extends QBOSyncProvider {}

// Re-export both classes/names for robust system-wide compatibility
export { QBOSyncProvider, QuickBooksSyncService as QBOSyncProviderAlias };
