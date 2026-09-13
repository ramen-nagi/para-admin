export function planFareChanges({ fares, destinationStopIds, standardValues, discountedValues, originStopId, tripId }) {
  const existing = new Map(fares.map((fare) => [`${fare.destination_stop_id}:${fare.fare_type ?? 'STANDARD'}`, fare]))
  const inserts = []
  const updates = []
  for (const destinationStopId of destinationStopIds) {
    for (const [fareType, group] of [['STANDARD', standardValues], ['DISCOUNTED', discountedValues]]) {
      const previous = existing.get(`${destinationStopId}:${fareType}`)
      const raw = String(group[destinationStopId] ?? '').trim()
      if (!raw) {
        if (previous) return { error: 'Use Delete to remove a saved fare, or restore its amount before saving.' }
        continue
      }
      const fare = Number(raw)
      if (!Number.isFinite(fare) || fare < 0 || Math.abs(fare * 100 - Math.round(fare * 100)) > 0.000001) return { error: 'Fares must be non-negative amounts with at most two decimal places.' }
      if (previous) {
        if (fare !== Number(previous.fare)) updates.push({ fareId: previous.fare_id, fare })
      } else inserts.push({ origin_stop_id: originStopId, destination_stop_id: destinationStopId, trip_id: tripId, fare_type: fareType, fare })
    }
  }
  return { inserts, updates, error: null }
}
