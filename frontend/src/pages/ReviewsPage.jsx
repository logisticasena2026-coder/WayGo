// ============================================================
// WayGo - Evaluaciones (calificar servicios y ver recibidas)
// ============================================================
import { useEffect, useState } from 'react'
import { reviewService } from '../services/review.service'
import { serviceService } from '../services/service.service'
import api, { apiErrorMessage } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { EmptyState } from '../components/StatusBadge'

const CRITERIA_LABELS = {
  PUNCTUALITY: 'Puntualidad', PRESENTATION: 'Presentacion personal', KINDNESS: 'Amabilidad',
  QUALITY: 'Calidad del servicio', SAFETY: 'Seguridad', VEHICLE_STATE: 'Estado del vehiculo',
  INSTRUCTIONS: 'Cumplimiento de instrucciones', CUSTOMER_KINDNESS: 'Amabilidad del cliente',
  CUSTOMER_PUNCTUALITY: 'Puntualidad del cliente', CUSTOMER_INSTRUCTIONS: 'Claridad de instrucciones',
}

export default function ReviewsPage() {
  const { user } = useAuth()
  const isCustomer = user?.role?.name === 'CUSTOMER'
  const [completed, setCompleted] = useState([])
  const [received, setReceived] = useState([])
  const [rating, setRating] = useState(null) // servicio a calificar
  const [criteria, setCriteria] = useState([])
  const [scores, setScores] = useState({})
  const [comment, setComment] = useState('')
  const [msg, setMsg] = useState(null)

  const load = async () => {
    try {
      const [srv, rev] = await Promise.all([serviceService.listMine('COMPLETED'), reviewService.listMine()])
      setCompleted(srv)
      setReceived(rev.received)
      // Servicios ya evaluados por mi (según tipo)
      const authoredRequestIds = new Set(rev.authored.map((r) => r.requestId))
      setCompleted((srv || []).filter((s) => !authoredRequestIds.has(s.id)))
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  useEffect(() => { load() }, [])

  const openRating = async (request) => {
    // Obtener criterios aplicables según rol
    const type = isCustomer ? 'CUSTOMER_TO_DRIVER' : 'DRIVER_TO_CUSTOMER'
    // Obtenemos los criterios desde el backend a traves del resumen o una llamada
    setRating(request)
    setScores({})
    setComment('')
    setCriteria([])
    try {
      // Usamos un criterio base: consultamos todos y filtramos por nombre
      const summary = request.assignment?.driverId && !isCustomer
        ? null
        : null
      // Simpler: cargamos criterios desde una lista estatica de codigos
      const codes = isCustomer
        ? ['PUNCTUALITY', 'PRESENTATION', 'KINDNESS', 'QUALITY', 'SAFETY']
        : ['CUSTOMER_KINDNESS', 'CUSTOMER_PUNCTUALITY', 'CUSTOMER_INSTRUCTIONS']
      setCriteria(codes)
    } catch (e) { /* noop */ }
  }

  const submit = async () => {
    setMsg(null)
    try {
      // Buscar criteriaId por codigo via una peticion: usamos resumen/lista
      // Obtenemos los criteriaId desde el backend
      const all = await fetchCriteriaIds()
      const payload = {
        requestId: rating.id,
        type: isCustomer ? 'CUSTOMER_TO_DRIVER' : 'DRIVER_TO_CUSTOMER',
        comment: comment || undefined,
        scores: Object.entries(scores).filter(([, v]) => v).map(([code, v]) => ({ criteriaId: all[code], score: Number(v) })),
      }
      if (payload.scores.length === 0) return setMsg({ type: 'error', text: 'Califica al menos un criterio' })
      await reviewService.create(payload)
      setMsg({ type: 'success', text: 'Evaluacion registrada. ¡Gracias!' })
      setRating(null); load()
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}

      <div className="wg-grid wg-grid--2" style={{ alignItems: 'start' }}>
        <div className="wg-card">
          <h2 style={{ marginBottom: 16 }}>Servicios por calificar ({completed.length})</h2>
          {completed.length === 0 && <EmptyState icon="⭐" title="Nada por calificar" text="Al completar un servicio podras calificarlo." />}
          <div className="wg-grid" style={{ gap: 12 }}>
            {completed.map((s) => (
              <div key={s.id} className="wg-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div>
                  <strong>#{s.requestNumber}</strong>
                  <div className="wg-muted" style={{ fontSize: 13 }}>{s.pickupAddress} → {s.dropoffAddress}</div>
                </div>
                <button className="wg-btn wg-btn--primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => openRating(s)}>Calificar</button>
              </div>
            ))}
          </div>
        </div>

        <div className="wg-card">
          <h2 style={{ marginBottom: 16 }}>Evaluaciones recibidas ({received.length})</h2>
          {received.length === 0 && <EmptyState icon="💬" title="Sin evaluaciones" />}
          <div className="wg-grid" style={{ gap: 12 }}>
            {received.map((r) => (
              <div key={r.id} className="wg-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="wg-muted" style={{ fontSize: 13 }}>{r.reviewer?.profile?.firstName} {r.reviewer?.profile?.lastName}</span>
                  <strong style={{ color: 'var(--wg-warning)' }}>{'★'.repeat(Math.round(Number(r.overall)))}</strong>
                </div>
                {r.comment && <p style={{ fontSize: 13, marginTop: 4 }}>“{r.comment}”</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {rating && (
        <div className="wg-card wg-mt" style={{ maxWidth: 560 }}>
          <h3>Calificar servicio #{rating.requestNumber}</h3>
          <div className="wg-grid" style={{ gap: 10, marginTop: 12 }}>
            {criteria.map((code) => (
              <div key={code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>{CRITERIA_LABELS[code] || code}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setScores({ ...scores, [code]: n })}
                      style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: (scores[code] || 0) >= n ? 'var(--wg-warning)' : 'var(--wg-gray-200)' }}>★</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="wg-field wg-mt"><label>Comentario</label><textarea className="wg-input" rows="2" value={comment} onChange={(e) => setComment(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="wg-btn wg-btn--primary" onClick={submit}>Enviar evaluacion</button>
            <button className="wg-btn wg-btn--ghost" onClick={() => setRating(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Obtiene un mapa { code -> criteriaId } desde el backend
async function fetchCriteriaIds() {
  const { data } = await api.get('/reviews/criteria')
  return data.criteria
}
