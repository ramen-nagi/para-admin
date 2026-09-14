export const STAFF_ROLES = ['admin', 'editor', 'operator']
export const OPERATION_TABS = ['overview', 'reports', 'fares', 'train-fares', 'route-suggestions']

export function canAccessTab(role, tab) {
  if (!STAFF_ROLES.includes(role)) return false
  if (tab === 'my-account') return true
  if (['accounts', 'passengers', 'staff'].includes(tab)) return role === 'admin'
  if (tab === 'gtfs') return role === 'admin' || role === 'editor'
  return OPERATION_TABS.includes(tab) && (role === 'admin' || role === 'operator')
}

export function defaultTab(role) {
  return role === 'editor' ? 'gtfs' : 'overview'
}
