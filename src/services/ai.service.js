// src/services/ai.service.js

const HF_API_URL = 'https://api-inference.huggingface.co/models'
const MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3'

/**
 * Construye el prompt estructurado para el LLM
 */
function buildPrompt(trip) {
  const { destino, fechaInicio, fechaFin, presupuesto, preferences } = trip
  const startDate = new Date(fechaInicio)
  const endDate = new Date(fechaFin)
  const numDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
  const { tipoTurismo, transporte, alojamiento } = preferences

  return `[INST] Eres un experto planificador de viajes. Genera un itinerario turístico detallado en JSON.

DATOS DEL VIAJE:
- Destino: ${destino}
- Duración: ${numDays} días
- Presupuesto total: $${presupuesto} COP
- Tipo de turismo: ${tipoTurismo}
- Transporte: ${transporte}
- Alojamiento: ${alojamiento}

INSTRUCCIONES ESTRICTAS:
1. Responde ÚNICAMENTE con JSON válido, sin texto adicional antes ni después.
2. El JSON debe seguir EXACTAMENTE esta estructura:
{
  "itinerario": [
    {
      "dia": 1,
      "actividades": [
        {
          "hora": "09:00",
          "actividad": "Nombre de la actividad",
          "ubicacion": "Lugar específico",
          "costo_estimado": 50000,
          "notas": "Tip o información útil"
        }
      ]
    }
  ]
}
3. Genera ${numDays} días con 3-5 actividades cada uno.
4. Los costos deben sumar aproximadamente $${presupuesto} COP en total.
5. Las actividades deben ser coherentes con el tipo de turismo "${tipoTurismo}".
6. Incluye horarios realistas y ubicaciones específicas de ${destino}.
[/INST]`
}

/**
 * Llama a la HuggingFace Inference API
 */
async function callHuggingFace(prompt) {
  const response = await fetch(`${HF_API_URL}/${MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
        return_full_text: false,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    // Modelo cargando (HF free tier lo duerme)
    if (response.status === 503) {
      throw Object.assign(new Error('El modelo de IA está iniciando. Intenta en 30 segundos.'), { status: 503 })
    }
    throw Object.assign(new Error(`Error de IA: ${err}`), { status: 502 })
  }

  const data = await response.json()
  // HF devuelve array con generated_text
  const raw = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text
  if (!raw) throw new Error('Respuesta vacía del modelo de IA')
  return raw
}

/**
 * Extrae y parsea el JSON de la respuesta del LLM
 */
function parseItineraryResponse(raw) {
  // Buscar el primer bloque JSON en la respuesta
  const jsonMatch = raw.match(/\{[\s\S]*"itinerario"[\s\S]*\}/m)
  if (!jsonMatch) {
    throw new Error('El modelo no devolvió JSON válido. Intenta de nuevo.')
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.itinerario || !Array.isArray(parsed.itinerario)) {
      throw new Error('Estructura de itinerario inválida')
    }
    return parsed.itinerario
  } catch {
    throw new Error('No se pudo parsear la respuesta del modelo. Intenta de nuevo.')
  }
}

/**
 * Genera el itinerario completo y lo devuelve como array de actividades planas
 */
export async function generateItinerary(trip) {
  const prompt = buildPrompt(trip)
  const raw = await callHuggingFace(prompt)
  const days = parseItineraryResponse(raw)

  // Aplanar a registros listos para insertar en la BD
  const activities = []
  for (const day of days) {
    const actividades = day.actividades || []
    actividades.forEach((act, idx) => {
      activities.push({
        viajeId: trip.id,
        dia: day.dia,
        hora: act.hora || null,
        actividad: act.actividad || 'Actividad sin nombre',
        ubicacion: act.ubicacion || null,
        costoEstimado: act.costo_estimado ? parseFloat(act.costo_estimado) : null,
        notas: act.notas || null,
        orden: idx + 1,
      })
    })
  }

  return activities
}
