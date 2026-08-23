import { supabase } from '../../lib/supabase'
import { FARE_TYPES, VEHICLE_TYPES } from '../fares/faresService'
import { TRAIN_LINES } from '../train-fares/trainLineConfig'

const REPORT_ATTENTION_STATUSES = ['open', 'under_review']
const SUGGESTION_ATTENTION_STATUSES = ['pending', 'under_review']

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

async function getStatusCount(table, status) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('status', status)

  return { count: count ?? 0, error }
}

async function getDistanceFareCount() {
  const { count, error } = await supabase
    .from('distance_fares')
    .select('fare_id', { count: 'exact', head: true })

  return { count: count ?? 0, error }
}

async function getTrainFareCompletion() {
  const { data, error } = await supabase
    .from('train_fares')
    .select('trip_id, origin_stop_id, destination_stop_id, fare_type')

  if (error) return { count: 0, error }

  const expected = countExpectedTrainFares()
  const configured = new Set(
    (data ?? []).map(
      (fare) =>
        `${fare.trip_id}:${fare.origin_stop_id}:${fare.destination_stop_id}:${fare.fare_type ?? 'STANDARD'}`,
    ),
  )
  const configuredExpected = [...configured].filter((key) => expected.has(key)).length

  return { count: configuredExpected, error: null }
}

export async function getOverviewMetrics() {
  const [
    openReports,
    underReviewReports,
    pendingSuggestions,
    underReviewSuggestions,
    fares,
    trainFares,
  ] = await Promise.all([
    getStatusCount('reports', REPORT_ATTENTION_STATUSES[0]),
    getStatusCount('reports', REPORT_ATTENTION_STATUSES[1]),
    getStatusCount('route_suggestions', SUGGESTION_ATTENTION_STATUSES[0]),
    getStatusCount('route_suggestions', SUGGESTION_ATTENTION_STATUSES[1]),
    getDistanceFareCount(),
    getTrainFareCompletion(),
  ])

  return {
    metrics: {
      reports: {
        open: openReports.count,
        underReview: underReviewReports.count,
        error: openReports.error || underReviewReports.error,
      },
      routeSuggestions: {
        pending: pendingSuggestions.count,
        underReview: underReviewSuggestions.count,
        error: pendingSuggestions.error || underReviewSuggestions.error,
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
    error: [
      openReports,
      underReviewReports,
      pendingSuggestions,
      underReviewSuggestions,
      fares,
      trainFares,
    ].some((result) => result.error),
  }
}
