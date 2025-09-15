# API Simple con Auto-eliminación

Una API REST simple que almacena datos temporalmente y los elimina automáticamente después de 2 horas.

## 🚀 Instalación

```bash
npm install
npm start
```

El servidor se ejecutará en `http://localhost:3005`

## 📖 Endpoints

### POST /api/data
Guarda nuevos datos que se eliminarán automáticamente en 2 horas.

**Request:**
```bash
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"name": "Juan", "email": "juan@example.com", "score": 100}'
```

**Response:**
```json
{
  "success": true,
  "message": "Datos guardados correctamente",
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "data": {
    "name": "Juan",
    "email": "juan@example.com",
    "score": 100,
    "timestamp": "2024-01-20T15:30:00.000Z",
    "createdAt": 1705758600000,
    "expiresAt": 1705765800000
  },
  "expiresIn": "2 horas"
}
```

### GET /api/data/:id
Obtiene datos específicos por ID (si no han expirado).

**Request:**
```bash
curl http://localhost:3000/api/data/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**Response (encontrado):**
```json
{
  "success": true,
  "data": {
    "name": "Juan",
    "email": "juan@example.com",
    "score": 100,
    "timestamp": "2024-01-20T15:30:00.000Z",
    "createdAt": 1705758600000,
    "expiresAt": 1705765800000
  },
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

**Response (no encontrado/expirado):**
```json
{
  "success": false,
  "error": "Registro no encontrado o expirado",
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

### GET /api/data
Obtiene todos los datos activos.

**Request:**
```bash
curl http://localhost:3000/api/data
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Juan",
      "email": "juan@example.com",
      "score": 100,
      "timestamp": "2024-01-20T15:30:00.000Z",
      "createdAt": 1705758600000,
      "expiresAt": 1705765800000
    }
  ],
  "count": 1
}
```

## ⚙️ Características

- **Auto-eliminación**: Los datos se eliminan automáticamente después de 2 horas
- **Almacenamiento en JSON**: Los datos se guardan en `data.json`
- **IDs únicos**: Cada registro recibe un UUID único
- **Limpieza automática**: El sistema ejecuta una limpieza cada 30 minutos
- **Gestión de errores**: Respuestas consistentes con manejo de errores
- **Timestamps**: Cada registro incluye timestamp de creación y expiración

## 📁 Estructura de datos

Cada registro almacenado incluye:

```json
{
  "tusDatos": "aquí van los datos que envíes",
  "timestamp": "2024-01-20T15:30:00.000Z",
  "createdAt": 1705758600000,
  "expiresAt": 1705765800000
}
```

- `timestamp`: Fecha/hora de creación en formato ISO
- `createdAt`: Timestamp de creación en milisegundos
- `expiresAt`: Timestamp de expiración en milisegundos

## 🛠️ Desarrollo

Para desarrollo con auto-restart, puedes usar `nodemon`:

```bash
npm install -g nodemon
nodemon server.js
```

## 📝 Notas

- Los datos se almacenan en memoria y archivo JSON
- La limpieza automática se ejecuta cada 30 minutos
- Los registros expiran exactamente 2 horas después de su creación
- Si el servidor se reinicia, los datos persisten en `data.json`
