import { supabase } from '../../lib/supabase'
import { FARE_TYPES, VEHICLE_TYPES } from '../fares/faresService'
import { TRAIN_LINES } from '../train-fares/trainLineConfig'

const REPORT_ATTENTION_STATUSES = ['open', 'under_review']
const SUGGESTION_ATTENTION_STATUSES = ['pending', 'under_review']
const TRAIN_FARE_PAGE_SIZE = 1000

function countExpectedTrainFares() {
  const expected = new Set()

  Object.values(TRAIN_LINES).forEach((line) => {
    const trips = [
      { id: line.northEastTripId, stops: line.stops },
      { id: line.southWestTripId, stops: [...line.stops].reverse() },
    ]

    trips.forEach(({ id, stops }) => {
      stops.forEach((originStopId, originIndex) => {
        stops.slice(originIndex + 1).forEach((destinationStopId) => {
          FARE_TYPES.forEach((fareType) => {
            expected.add(`${id}:${originStopId}:${destinationStopId}:${fareType}`)
          })
        })
      })
    })
  })

  return expected
}

export const EXPECTED_DISTANCE_FARES = VEHICLE_TYPES.length * FARE_TYPES.length
export const EXPECTED_TRAIN_FARES = countExpectedTrainFares().size

async function getAttentionRows(table, select, statuses) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .in('status', statuses)
    .order('created_at', { ascending: false })

  return { rows: data ?? [], error }
}

async function getDistanceFareCount() {
  const { count, error } = await supabase
    .from('distance_fares')
    .select('fare_id', { count: 'exact', head: true })

  return { count: count ?? 0, error }
}

async function getTrainFareCompletion() {
  const fares = []

  for (let start = 0; ; start += TRAIN_FARE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('train_fares')
      .select('fare_id, trip_id, origin_stop_id, destination_stop_id, fare_type')
      .order('fare_id', { ascending: true })
      .range(start, start + TRAIN_FARE_PAGE_SIZE - 1)

    if (error) return { count: 0, error }

    fares.push(...(data ?? []))
    if (!data || data.length < TRAIN_FARE_PAGE_SIZE) break
  }

  const expected = countExpectedTrainFares()
  const configured = new Set(
    fares.map(
      (fare) =>
        `${fare.trip_id}:${fare.origin_stop_id}:${fare.destination_stop_id}:${fare.fare_type ?? 'STANDARD'}`,
    ),
  )
  const configuredExpected = [...configured].filter((key) => expected.has(key)).length

  return { count: configuredExpected, error: null }
}

export async function getOverviewMetrics() {
  const [reports, routeSuggestions, fares, trainFares] = await Promise.all([
    getAttentionRows(
      'reports',
      'id, created_at, category, description, status, route_id, trip_id',
      REPORT_ATTENTION_STATUSES,
    ),
    getAttentionRows(
      'route_suggestions',
      'id, created_at, route_name, vehicle_type, status, start_latitude, start_longitude, end_latitude, end_longitude',
      SUGGESTION_ATTENTION_STATUSES,
    ),
    getDistanceFareCount(),
    getTrainFareCompletion(),
  ])

  const openReports = reports.rows.filter((report) => report.status === 'open').length
  const underReviewReports = reports.rows.filter(
    (report) => report.status === 'under_review',
  ).length
  const pendingSuggestions = routeSuggestions.rows.filter(
    (suggestion) => suggestion.status === 'pending',
  ).length
  const underReviewSuggestions = routeSuggestions.rows.filter(
    (suggestion) => suggestion.status === 'under_review',
  ).length

  return {
    metrics: {
      reports: {
        open: openReports,
        underReview: underReviewReports,
        rows: reports.rows,
        error: reports.error,
      },
      routeSuggestions: {
        pending: pendingSuggestions,
        underReview: underReviewSuggestions,
        rows: routeSuggestions.rows,
        error: routeSuggestions.error,
      },
      distanceFares: {
        configured: fares.count,
        expected: EXPECTED_DISTANCE_FARES,
        error: fares.error,
      },
      trainFares: {
        configured: trainFares.count,
        expected: EXPECTED_TRAIN_FARES,
        error: trainFares.error,
      },
    },
    error: [reports, routeSuggestions, fares, trainFares].some((result) => result.error),
  }
}
