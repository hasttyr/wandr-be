// src/index.js
import 'dotenv/config'
import app from './app.js'

const PORT = process.env.PORT || 3000

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Wandr API corriendo en puerto ${PORT}`)
  console.log(`📦 Entorno: ${process.env.NODE_ENV || 'development'}`)
})
