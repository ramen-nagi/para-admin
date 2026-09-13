export function mutationError(error, fallback = 'The change could not be saved. Please try again.') {
  if (error?.code === '23503') return 'This record is linked to other data. Remove those links before deleting it.'
  if (error?.code === '23505') return 'A matching record already exists. Refresh the list and edit that record instead.'
  if (error?.code === '42501' || error?.code === 'PGRST116') return 'This record is unavailable or your account does not have permission to change it. Refresh and try again.'
  return fallback
}

// Returning the deleted key makes an RLS-filtered, zero-row delete a failure.
export async function deleteRecord(client, table, key, id) {
  if (id === null || id === undefined || id === '') return { error: { message: 'Missing record ID.' } }
  const { error } = await client.from(table).delete().eq(key, id).select(key).single()
  return { error }
}
