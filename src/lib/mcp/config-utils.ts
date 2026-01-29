/**
 * MCP Configuration Utilities
 *
 * Shared utilities for MCP configuration
 */

export type ConfigStatus =
  | 'configured'            // ✅ TalkToFigmaDesktop found in config
  | 'exists-not-configured' // ⚠️ Config exists, our server missing
  | 'not-found'             // ⚪ Config file doesn't exist
  | 'no-permission'         // 🔒 Can't read config
  | 'unknown'               // ❓ Can't determine

/**
 * Get status badge info (color, icon, label)
 */
export function getStatusBadgeInfo(status: ConfigStatus): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  label: string
  icon: string
} {
  switch (status) {
    case 'configured':
      return {
        variant: 'default',
        label: 'Configured',
        icon: '✅'
      }
    case 'exists-not-configured':
      return {
        variant: 'secondary',
        label: 'Not Configured',
        icon: '⚠️'
      }
    case 'not-found':
      return {
        variant: 'outline',
        label: 'Not Detected',
        icon: '⚪'
      }
    case 'no-permission':
      return {
        variant: 'destructive',
        label: 'No Permission',
        icon: '🔒'
      }
    case 'unknown':
    default:
      return {
        variant: 'outline',
        label: 'Unknown',
        icon: '❓'
      }
  }
}
