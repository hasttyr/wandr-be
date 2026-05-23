// src/services/ai.service.js

// ── Configuración ────────────────────────────────────────────────────────────
// HuggingFace Serverless Inference API
// El free tier duerme los modelos → primer request puede tardar 20-40s (cold start)
// Modelos recomendados que sí soportan el endpoint /v1/chat/completions:
//   - mistralai/Mistral-7B-Instruct-v0.3  (rápido, buen JSON)
//   - meta-llama/Llama-3.1-8B-Instruct    (mejor calidad)
//   - HuggingFaceH4/zephyr-7b-beta        (alternativa estable)

const HF_BASE_URL = 'https://api-inference.huggingface.co'
const MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3'

/**
 * Construye los mensajes para la Chat Completions API
 * (más estable que la Inference API cruda — mejor soporte JSON)
 */
function buildMessages(trip) {
  const { destino, fechaInicio, fechaFin, presupuesto, preferences } = trip
  const startDate = new Date(fechaInicio)
  const endDate   = new Date(fechaFin)
  const numDays   = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
  const { tipoTurismo, transporte, alojamiento } = preferences

  const presupuestoFormateado = Number(presupuesto).toLocaleString('es-CO')

  return [
    {
      role: 'system',
      content: 'Eres un experto planificador de viajes. Respondes ÚNICAMENTE con JSON válido, sin texto adicional, sin bloques de código markdown, sin explicaciones.',
    },
    {
      role: 'user',
      content: `Genera un itinerario turístico para:
- Destino: ${destino}
- Duración: ${numDays} días
- Presupuesto: $${presupuestoFormateado} COP
- Tipo de turismo: ${tipoTurismo}
- Transporte: ${transporte}
- Alojamiento: ${alojamiento}

Devuelve SOLO este JSON (sin \`\`\`json ni texto extra):
{
  "itinerario": [
    {
      "dia": 1,
      "actividades": [
        {
          "hora": "09:00",
          "actividad": "Nombre de la actividad",
          "ubicacion": "Lugar específico en ${destino}",
          "costo_estimado": 50000,
          "notas": "Tip útil"
        }
      ]
    }
  ]
}

Genera exactamente ${numDays} días con 3-5 actividades cada uno. Los costos en COP.`,
    },
  ]
}

/**
 * Llama a HuggingFace usando la Chat Completions API compatible con OpenAI
 * Más fiable que la Inference API cruda para generar JSON estructurado
 */
async function callHuggingFace(messages) {
  const url = `${HF_BASE_URL}/v1/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 3000,
      temperature: 0.4,   // más bajo = JSON más consistente
      top_p: 0.9,
      stream: false,
    }),
  })

  // Capturar body antes de decidir qué hacer con el error
  const bodyText = await response.text()

  if (!response.ok) {
    console.error(`[HF] HTTP ${response.status}:`, bodyText.slice(0, 300))

    if (response.status === 503) {
      throw Object.assign(
        new Error('El modelo de IA está iniciando (cold start). Espera 30 segundos e intenta de nuevo.'),
        { status: 503 }
      )
    }
    if (response.status === 401) {
      throw Object.assign(
        new Error('API key de HuggingFace inválida o sin permisos. Verifica HF_API_KEY en las variables de entorno.'),
        { status: 502 }
      )
    }
    if (response.status === 429) {
      throw Object.assign(
        new Error('Límite de requests de HuggingFace alcanzado. Intenta en unos minutos.'),
        { status: 429 }
      )
    }
    // El modelo no soporta chat completions — intentar con inference API como fallback
    if (response.status === 404 || response.status === 422) {
      console.warn('[HF] Chat completions no disponible para este modelo, usando Inference API...')
      return callHuggingFaceInference(messages)
    }

    throw Object.assign(new Error(`Error de HuggingFace (${response.status})`), { status: 502 })
  }

  let data
  try {
    data = JSON.parse(bodyText)
  } catch {
    throw new Error('Respuesta no válida de HuggingFace')
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    console.error('[HF] Respuesta inesperada:', JSON.stringify(data).slice(0, 300))
    throw new Error('El modelo no devolvió contenido. Intenta de nuevo.')
  }

  return content
}

/**
 * Fallback: Inference API clásica (para modelos que no soportan /v1/chat/completions)
 */
async function callHuggingFaceInference(messages) {
  // Convertir mensajes a prompt estilo [INST]
  const systemMsg = messages.find(m => m.role === 'system')?.content || ''
  const userMsg   = messages.find(m => m.role === 'user')?.content || ''
  const prompt    = `[INST] ${systemMsg}\n\n${userMsg} [/INST]`

  const response = await fetch(`${HF_BASE_URL}/models/${MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 3000,
        temperature: 0.4,
        top_p: 0.9,
        do_sample: true,
        return_full_text: false,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    if (response.status === 503) {
      throw Object.assign(
        new Error('El modelo de IA está iniciando. Espera 30 segundos e intenta de nuevo.'),
        { status: 503 }
      )
    }
    throw Object.assign(new Error(`Error de HuggingFace: ${err.slice(0, 200)}`), { status: 502 })
  }

  const data = await response.json()
  const raw  = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text
  if (!raw) throw new Error('Respuesta vacía del modelo de IA')
  return raw
}

/**
 * Extrae y parsea el JSON de la respuesta del LLM
 * Maneja bloques ```json ... ```, JSON suelto, y texto con JSON embebido
 */
function parseItineraryResponse(raw) {
  // 1. Limpiar bloques markdown ```json ... ```
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // 2. Intentar parsear directo
  try {
    const parsed = JSON.parse(cleaned)
    if (parsed.itinerario && Array.isArray(parsed.itinerario)) return parsed.itinerario
  } catch { /* continuar */ }

  // 3. Buscar el primer objeto JSON con "itinerario"
  const jsonMatch = cleaned.match(/\{[\s\S]*?"itinerario"[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.itinerario && Array.isArray(parsed.itinerario)) return parsed.itinerario
    } catch { /* continuar */ }
  }

  // 4. Buscar array directo
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      const arr = JSON.parse(arrayMatch[0])
      if (Array.isArray(arr) && arr[0]?.actividades) return arr
    } catch { /* continuar */ }
  }

  console.error('[AI] No se pudo parsear respuesta. Raw (500 chars):', raw.slice(0, 500))
  throw new Error('El modelo no devolvió JSON válido. Intenta de nuevo.')
}

/**
 * Genera el itinerario completo y lo devuelve como array de actividades planas
 */
export async function generateItinerary(trip) {
  const messages = buildMessages(trip)
  const raw      = await callHuggingFace(messages)
  const days     = parseItineraryResponse(raw)

  const activities = []
  for (const day of days) {
    const actividades = day.actividades || []
    actividades.forEach((act, idx) => {
      activities.push({
        viajeId:       trip.id,
        dia:           day.dia,
        hora:          act.hora       || null,
        actividad:     act.actividad  || 'Actividad sin nombre',
        ubicacion:     act.ubicacion  || null,
        costoEstimado: act.costo_estimado ? parseFloat(String(act.costo_estimado).replace(/,/g, '')) : null,
        notas:         act.notas      || null,
        orden:         idx + 1,
      })
    })
  }

  if (activities.length === 0) {
    throw new Error('El modelo generó un itinerario vacío. Intenta de nuevo.')
  }

  return activities
}
