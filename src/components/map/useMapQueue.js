import { useCallback, useMemo } from 'react'
import { inRange } from '../../lib/dateRange.js'
import { matches } from '../../lib/filters.js'
import { useFilteredPicks } from '../../state/FilterContext.jsx'
import { useMap } from '../../state/MapContext.jsx'
import { useQueue } from '../../state/ParticipantContext.jsx'

// Who the map shows, shared by the Map view and the Schedule's map tile. The
// shared filter narrows it the way it narrows the schedule (OR inside a group,
// AND across). Each person is matched on their booking state, so anyone open to
// book drops out once a status or moderator is picked. Bookings also have to
// fall in the date range; people open to book have no date and follow only
// their layer switch.
export default function useMapQueue() {
  const queue = useQueue()
  const { layers, range } = useMap()
  const picks = useFilteredPicks()

  const visible = useCallback((p) => layers[p.status]
    && (!p.session || inRange(range, p.session.date))
    && matches(picks, { status: p.status, moderator: p.session?.moderator }), [layers, range, picks])

  const onLayers = useMemo(() => queue.filter((p) => layers[p.status]), [queue, layers])
  const shown = useMemo(() => onLayers.filter(visible), [onLayers, visible])
  return { queue, onLayers, shown, visible }
}
