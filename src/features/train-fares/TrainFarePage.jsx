import { useEffect, useMemo, useState } from 'react'
import useUnsavedChanges, { canLeaveEditor } from '../../hooks/useUnsavedChanges'
import DeleteButton from '../../components/DeleteButton'
import { planFareChanges } from './fareChanges'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import AdminLayout from '../../layouts/AdminLayout'
import {
  createTrainFares,
  deleteTrainFare,
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
  const [deleting, setDeleting] = useState(false)
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

  const pendingChanges = planFareChanges({ fares, destinationStopIds: downstreamStopIds, standardValues, discountedValues, originStopId, tripId })
  useUnsavedChanges(routeLoaded && Boolean(pendingChanges.error || pendingChanges.inserts?.length || pendingChanges.updates?.length), saving || deleting || loadingFares)

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
    if (!canLeaveEditor()) return
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
    if (!canLeaveEditor()) return
    setDirection(value)
    setOriginStopId('')
    setFares([])
    setStandardValues({})
    setDiscountedValues({})
    setRouteLoaded(false)
    setSuccess('')
  }

  async function loadRouteFares() {
    if (!canLeaveEditor()) return
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
    const plan = planFareChanges({ fares, destinationStopIds: downstreamStopIds, standardValues, discountedValues, originStopId, tripId })
    if (plan.error) return setError(plan.error)
    if (!plan.inserts.length && !plan.updates.length) return setSuccess('No changes to save.')
    setSaving(true)
    try {
      const results = await Promise.allSettled([
        ...(plan.inserts.length ? [createTrainFares(plan.inserts)] : []),
        ...plan.updates.map(({ fareId, fare }) => updateTrainFare(fareId, { fare })),
      ])
      const saved = results.flatMap((result) => result.status === 'fulfilled' && !result.value.error ? result.value.fares ?? [result.value.fare] : [])
      // Keep successful writes so retrying a partially failed save does not insert them again.
      setFares((current) => [...current.filter((fare) => !saved.some((item) => item.fare_id === fare.fare_id)), ...saved])
      if (results.some((result) => result.status === 'rejected' || result.value.error)) setError('Some fares could not be saved. Successful changes were kept; retry to save the remaining changes.')
      else setSuccess('Fares saved successfully.')
    } catch { setError('Fares could not be saved. Check your connection and try again.') }
    finally { setSaving(false) }
  }

  function renderFareInput(destinationStopId, fareType, values, setter) {
    const existing = fares.find((fare) => fare.destination_stop_id === destinationStopId && (fare.fare_type ?? 'STANDARD') === fareType)
    const label = `${lineName} ? ${direction === 'southWest' ? DIRECTIONS.southWest : DIRECTIONS.northEast} ? ${stationLabel(stopMap.get(originStopId))} to ${stationLabel(stopMap.get(destinationStopId))} ? ${fareType}`
    return <div className="fare-cell">
      <input className="table-fare-input" type="number" min="0" step="0.01" aria-label={`${fareType} fare to ${stationLabel(stopMap.get(destinationStopId))}`}
        disabled={saving || deleting || loadingFares} value={values[destinationStopId] ?? ''}
        onChange={(event) => { setSuccess(''); updateValue(setter, destinationStopId, event.target.value) }} placeholder="Not configured" />
      {existing && <DeleteButton label={`${label} ? Fare #${existing.fare_id}`} disabled={saving || deleting || loadingFares}
        onDelete={async () => { setDeleting(true); try { return await deleteTrainFare(existing.fare_id) } finally { setDeleting(false) } }}
        onDeleted={() => {
          setFares((current) => current.filter((fare) => fare.fare_id !== existing.fare_id))
          setter((current) => { const next = { ...current }; delete next[destinationStopId]; return next })
          setError(''); setSuccess(`${fareType} fare deleted successfully.`)
        }} />}
    </div>
  }

  const trainFareColumns = [
    {
      key: 'origin',
      label: 'Origin',
      render: () => stationLabel(stopMap.get(originStopId)),
    },
    {
      key: 'destination',
      label: 'Destination',
      render: (destinationStopId) => stationLabel(stopMap.get(destinationStopId)),
    },
    {
      key: 'standard',
      label: 'STANDARD',
      render: (id) => renderFareInput(id, 'STANDARD', standardValues, setStandardValues),
    },
    {
      key: 'discounted',
      label: 'DISCOUNTED',
      render: (id) => renderFareInput(id, 'DISCOUNTED', discountedValues, setDiscountedValues),
    },
  ]

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
            disabled={saving || deleting || loadingFares}
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
            disabled={!line || saving || deleting || loadingFares}
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
              if (!canLeaveEditor()) return
              setOriginStopId(event.target.value)
              setFares([])
              setStandardValues({})
              setDiscountedValues({})
              setRouteLoaded(false)
              setSuccess('')
            }}
            disabled={!direction || loadingStops || saving || deleting || loadingFares}
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
          disabled={!originStopId || loadingFares || saving || deleting}
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
        <DataTable
          pageSize={0}
          caption={`${lineName} · ${direction === 'southWest' ? DIRECTIONS.southWest : DIRECTIONS.northEast} · Trip ${tripId}`}
          columns={trainFareColumns}
          rows={downstreamStopIds}
          getRowKey={(destinationStopId) => destinationStopId}
          footer={
            <div className="batch-actions">
              <p className="record-meta">Blank fares are not configured. Use Delete to remove an existing fare.</p>
              <button
                className="primary-button"
                type="button"
                onClick={saveFares}
                disabled={saving || deleting || loadingFares}
              >
                {saving ? 'Saving fares…' : 'Save fares'}
              </button>
            </div>
          }
        />
      )}
    </AdminLayout>
  )
}

export default TrainFarePage
