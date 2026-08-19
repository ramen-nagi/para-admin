import { supabase } from '../../lib/supabase'

export const VEHICLE_TYPES = [1, 3, 4, 5]
export const FARE_TYPES = ['STANDARD', 'DISCOUNTED']

export async function getFareMatrix() {
  const { data, error } = await supabase.from('distance_fares').select('*').order('vehicle_type').order('fare_type')
  return { fares: data ?? [], error }
}

export async function createFare(fare) {
  const { data, error } = await supabase.from('distance_fares').insert(fare).select().single()
  return { fare: data, error }
}

export async function updateFare(fareId, fare) {
  const { data, error } = await supabase.from('distance_fares').update(fare).eq('fare_id', fareId).select().single()
  return { fare: data, error }
}
