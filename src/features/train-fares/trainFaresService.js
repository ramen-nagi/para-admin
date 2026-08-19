import { supabase } from '../../lib/supabase'

export async function getStopsByIds(stopIds) {
  const { data, error } = await supabase
    .from('stops')
    .select('stop_id, stop_name')
    .in('stop_id', stopIds)
  return { stops: data ?? [], error }
}

export async function getTrainFaresForRoute({ tripId, originStopId, destinationStopIds }) {
  const { data, error } = await supabase
    .from('train_fares')
    .select('*')
    .eq('trip_id', tripId)
    .eq('origin_stop_id', originStopId)
    .in('destination_stop_id', destinationStopIds)
  return { fares: data ?? [], error }
}

export async function createTrainFares(fares) {
  const { data, error } = await supabase.from('train_fares').insert(fares).select()
  return { fares: data ?? [], error }
}

export async function updateTrainFare(fareId, fare) {
  const { data, error } = await supabase
    .from('train_fares')
    .update(fare)
    .eq('fare_id', fareId)
    .select()
    .single()
  return { fare: data, error }
}
