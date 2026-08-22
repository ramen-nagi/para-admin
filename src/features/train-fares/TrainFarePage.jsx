import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import AdminLayout from '../../layouts/AdminLayout'
import {
  createTrainFares,
  getStopsByIds,
  getTrainFaresForRoute,
  updateTrainFare,
} from './trainFaresService'
import { DIRECTIONS, TRAIN_LINES } from './trainLineConfig'

function stationLabel(stop) {
  return stop?.stop_name
    ? `${stop.stop_name} (${stop.stop_id})`
    : (stop?.stop_id ?? 'Unknown station')
}

function TrainFarePage({ userEmail, onSignOut, onTabChange }) {
  const [lineName, setLineName] = useState('')
  const [direction, setDirection] = useState('')
  const [originStopId, setOriginStopId] = useState('')
  const [stops, setStops] = useState([])
  const [fares, setFares] = useState([])
  const [standardValues, setStandardValues] = useState({})
  const [discountedValues, setDiscountedValues] = useState({})
  const [loadingStops, setLoadingStops] = useState(false)
  const [loadingFares, setLoadingFares] = useState(false)
  const [routeLoaded, setRouteLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const line = lineName ? TRAIN_LINES[lineName] : null
  const orderedStopIds = useMemo(() => {
    if (!line) return []
    return direction === 'southWest' ? [...line.stops].reverse() : line.stops
  }, [direction, line])
  const originIndex = orderedStopIds.indexOf(originStopId)
  const downstreamStopIds = originIndex >= 0 ? orderedStopIds.slice(originIndex + 1) : []
  const stopMap = useMemo(() => new Map(stops.map((stop) => [stop.stop_id, stop])), [stops])
  const tripId = line
    ? direction === 'southWest'
      ? line.southWestTripId
      : line.northEastTripId
    : ''

  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      if (!line) return
      setLoadingStops(true)
      setError('')
      getStopsByIds(line.stops).then((result) => {
        if (!active) return
        if (result.error) setError('Stations could not be loaded.')
        else setStops(result.stops)
        setLoadingStops(false)
      })
    }, 0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [line])

  function handleLineChange(value) {
    setLineName(value)
    setDirection('')
    setOriginStopId('')
    setStops([])
    setFares([])
    setStandardValues({})
    setDiscountedValues({})
    setRouteLoaded(false)
    setSuccess('')
  }

  function handleDirectionChange(value) {
    setDirection(value)
    setOriginStopId('')
    setFares([])
    setStandardValues({})
    setDiscountedValues({})
    setRouteLoaded(false)
    setSuccess('')
  }

  async function loadRouteFares() {
    if (!tripId || !originStopId || downstreamStopIds.length === 0) return
    setLoadingFares(true)
    setError('')
    setSuccess('')
    const result = await getTrainFaresForRoute({
      tripId,
      originStopId,
      destinationStopIds: downstreamStopIds,
    })
    if (result.error) setError('Fares could not be loaded. Check your permissions and try again.')
    else {
      setFares(result.fares)
      setStandardValues(
        Object.fromEntries(
          result.fares
            .filter((fare) => (fare.fare_type ?? 'STANDARD') === 'STANDARD')
            .map((fare) => [fare.destination_stop_id, String(fare.fare)]),
        ),
      )
      setDiscountedValues(
        Object.fromEntries(
          result.fares
            .filter((fare) => fare.fare_type === 'DISCOUNTED')
            .map((fare) => [fare.destination_stop_id, String(fare.fare)]),
        ),
      )
      setRouteLoaded(true)
    }
    setLoadingFares(false)
  }

  function updateValue(setter, destinationStopId, value) {
    setter((current) => ({ ...current, [destinationStopId]: value }))
  }

  async function saveFares() {
    setError('')
    setSuccess('')
    const values = [standardValues, discountedValues]
    const incomplete = downstreamStopIds.some((stopId) =>
      values.some((group) => group[stopId] === undefined || group[stopId] === ''),
    )
    const invalid = downstreamStopIds.some((stopId) =>
      values.some((group) => !Number.isFinite(Number(group[stopId])) || Number(group[stopId]) < 0),
    )
    if (incomplete || invalid) {
      setError('Enter valid STANDARD and DISCOUNTED fares for every downstream destination.')
      return
    }

    setSaving(true)
    const existing = new Map(
      fares.map((fare) => [`${fare.destination_stop_id}:${fare.fare_type ?? 'STANDARD'}`, fare]),
    )
    const inserts = []
    const updates = []
    downstreamStopIds.forEach((destinationStopId) => {
      ;[
        ['STANDARD', standardValues],
        ['DISCOUNTED', discountedValues],
      ].forEach(([fareType, group]) => {
        const key = `${destinationStopId}:${fareType}`
        const fare = Number(group[destinationStopId])
        if (existing.has(key)) updates.push(updateTrainFare(existing.get(key).fare_id, { fare }))
        else
          inserts.push({
            origin_stop_id: originStopId,
            destination_stop_id: destinationStopId,
            fare_type: fareType,
            fare,
            trip_id: tripId,
          })
      })
    })
    const [insertResult, ...updateResults] = await Promise.all([
      inserts.length ? createTrainFares(inserts) : Promise.resolve({ error: null }),
      ...updates,
    ])
    if (insertResult.error || updateResults.some((result) => result.error))
      setError('Some fares could not be saved. Your entered values were kept.')
    else {
      await loadRouteFares()
      setSuccess('STANDARD and DISCOUNTED fares saved successfully.')
    }
    setSaving(false)
  }

  return (
    <AdminLayout
      userEmail={userEmail}
      onSignOut={onSignOut}
      activeTab="train-fares"
      onTabChange={onTabChange}
    >
      <PageHeader
        title="Train Fare"
        subtitle="Choose a line, direction, and origin to manage downstream station fares."
      />
      <section className="train-fare-filters" aria-label="Train fare selection">
        <div className="filter-field">
          <label htmlFor="train-line">Train line</label>
          <select
            id="train-line"
            value={lineName}
            onChange={(event) => handleLineChange(event.target.value)}
          >
            <option value="">Select train line</option>
            {Object.keys(TRAIN_LINES).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="train-direction">Direction</label>
          <select
            id="train-direction"
            value={direction}
            onChange={(event) => handleDirectionChange(event.target.value)}
            disabled={!line}
          >
            <option value="">Select direction</option>
            <option value="northEast">{DIRECTIONS.northEast}</option>
            <option value="southWest">{DIRECTIONS.southWest}</option>
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="train-origin">Origin station</label>
          <select
            id="train-origin"
            value={originStopId}
            onChange={(event) => {
              setOriginStopId(event.target.value)
              setFares([])
              setStandardValues({})
              setDiscountedValues({})
              setRouteLoaded(false)
              setSuccess('')
            }}
            disabled={!direction || loadingStops}
          >
            <option value="">{loadingStops ? 'Loading stations…' : 'Select origin station'}</option>
            {orderedStopIds.slice(0, -1).map((stopId) => (
              <option key={stopId} value={stopId}>
                {stationLabel(stopMap.get(stopId))}
              </option>
            ))}
          </select>
        </div>
        <button
          className="primary-button compact"
          type="button"
          onClick={loadRouteFares}
          disabled={!originStopId || loadingFares}
        >
          {loadingFares ? 'Loading…' : 'Show fares'}
        </button>
      </section>
      {error && (
        <p className="error-message train-fare-message" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="success-message train-fare-message" role="status">
          {success}
        </p>
      )}
      {originStopId && downstreamStopIds.length > 0 && !routeLoaded && !loadingFares && (
        <div className="state-card">
          <p>Choose “Show fares” to load this route.</p>
        </div>
      )}
      {routeLoaded && (
        <div className="table-card">
          <div className="results-caption">
            {lineName} · {direction === 'southWest' ? DIRECTIONS.southWest : DIRECTIONS.northEast} ·
            Trip {tripId}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>STANDARD</th>
                  <th>DISCOUNTED</th>
                </tr>
              </thead>
              <tbody>
                {downstreamStopIds.map((destinationStopId) => (
                  <tr key={destinationStopId}>
                    <td>{stationLabel(stopMap.get(originStopId))}</td>
                    <td>{stationLabel(stopMap.get(destinationStopId))}</td>
                    <td>
                      <input
                        className="table-fare-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={standardValues[destinationStopId] ?? ''}
                        onChange={(event) =>
                          updateValue(setStandardValues, destinationStopId, event.target.value)
                        }
                        placeholder="Enter fare"
                      />
                    </td>
                    <td>
                      <input
                        className="table-fare-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountedValues[destinationStopId] ?? ''}
                        onChange={(event) =>
                          updateValue(setDiscountedValues, destinationStopId, event.target.value)
                        }
                        placeholder="Enter fare"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="batch-actions">
            <button className="primary-button" type="button" onClick={saveFares} disabled={saving}>
              {saving ? 'Saving fares…' : 'Save fares'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default TrainFarePage
