const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Configuración: tiempo de vida de los registros en milisegundos (2 horas)
const RECORD_LIFETIME = 2 * 60 * 60 * 1000; // 2 horas

// Middleware
app.use(cors()); // Permitir requests desde React
app.use(express.json());

// Funciones auxiliares para manejo del archivo JSON
function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return {};
        }
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo archivo JSON:', error);
        return {};
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error escribiendo archivo JSON:', error);
        return false;
    }
}

// Función para limpiar registros viejos
function cleanupOldRecords() {
    const data = readData();
    const now = Date.now();
    const cleanedData = {};
    let deletedCount = 0;
    
    for (const [id, record] of Object.entries(data)) {
        const recordAge = now - record.createdAt;
        if (recordAge < RECORD_LIFETIME) {
            cleanedData[id] = record;
        } else {
            deletedCount++;
        }
    }
    
    if (deletedCount > 0) {
        writeData(cleanedData);
        console.log(`Limpieza automática: ${deletedCount} registros eliminados por tiempo (2 horas)`);
    }
    
    return cleanedData;
}

// Ejecutar limpieza cada 30 minutos
setInterval(cleanupOldRecords, 30 * 60 * 1000);

// Ruta GET: Obtener datos por ID
app.get('/api/data/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = cleanupOldRecords(); // Limpiar antes de buscar
        
        if (data[id]) {
            res.json({
                success: true,
                data: data[id],
                id: id
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Registro no encontrado o expirado',
                id: id
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo datos',
            message: error.message
        });
    }
});

// Ruta GET: Obtener todos los datos (opcional)
app.get('/api/data', (req, res) => {
    try {
        const data = cleanupOldRecords(); // Limpiar antes de devolver datos
        const dataArray = Object.entries(data).map(([id, record]) => ({
            id,
            ...record
        }));
        
        res.json({
            success: true,
            data: dataArray,
            count: dataArray.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo datos',
            message: error.message
        });
    }
});

// Ruta POST: Agregar nuevos datos de build
app.post('/api/data', (req, res) => {
    try {
        const buildData = req.body;
        
        // Validar que se envíen datos
        if (!buildData || Object.keys(buildData).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No se enviaron datos del build'
            });
        }
        
        // Validaciones específicas para builds de WoW
        const requiredFields = ['name', 'className', 'assignedPoints', 'totalPoints', 'availablePoints'];
        const missingFields = requiredFields.filter(field => !buildData.hasOwnProperty(field));
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos faltantes',
                missingFields: missingFields
            });
        }
        
        // Generar ID único (reemplazar temp_id si existe)
        const id = uuidv4();
        
        // Crear registro con metadata, removiendo el temp_id si existe
        const { id: tempId, createdAt: originalCreatedAt, ...cleanBuildData } = buildData;
        
        const recordWithMetadata = {
            ...cleanBuildData,
            id: id, // Nuestro ID único
            originalId: tempId, // Preservar el ID temporal original si existe
            timestamp: new Date().toISOString(),
            createdAt: Date.now(),
            expiresAt: Date.now() + RECORD_LIFETIME,
            buildType: 'wow-talent-build'
        };
        
        // Leer datos existentes y agregar el nuevo registro
        const data = readData();
        data[id] = recordWithMetadata;
        
        // Guardar datos
        if (writeData(data)) {
            res.status(201).json({
                success: true,
                message: 'Build guardado correctamente',
                id: id,
                build: recordWithMetadata,
                expiresIn: '2 horas',
                expiresAt: new Date(recordWithMetadata.expiresAt).toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Error guardando build'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error procesando build',
            message: error.message
        });
    }
});

// Ruta adicional para obtener estadísticas
app.get('/api/stats', (req, res) => {
    try {
        const data = readData();
        const now = Date.now();
        const dataArray = Object.values(data);
        
        const stats = {
            total: dataArray.length,
            active: dataArray.filter(record => {
                const recordAge = now - record.createdAt;
                return recordAge < RECORD_LIFETIME;
            }).length,
            expiringSoon: dataArray.filter(record => {
                const timeLeft = record.expiresAt - now;
                return timeLeft < (30 * 60 * 1000) && timeLeft > 0; // Expiran en menos de 30 minutos
            }).length,
            recordLifetime: '2 horas',
            nextCleanup: new Date(now + (30 * 60 * 1000)).toISOString()
        };
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas',
            message: error.message
        });
    }
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        availableRoutes: [
            'GET /api/data/:id - Obtener datos por ID',
            'GET /api/data - Obtener todos los datos',
            'POST /api/data - Agregar nuevos datos (se eliminan automáticamente en 2 horas)',
            'GET /api/stats - Obtener estadísticas'
        ]
    });
});

// Middleware para manejo de errores
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 API ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 Ruta principal: http://localhost:${PORT}/api/data`);
    console.log(`🔍 Obtener por ID: http://localhost:${PORT}/api/data/:id`);
    console.log(`🧹 Auto-eliminación: cada 2 horas por registro`);
    console.log(`⏰ Limpieza automática: cada 30 minutos`);
    
    // Crear archivo de datos inicial si no existe
    if (!fs.existsSync(DATA_FILE)) {
        writeData({});
        console.log(`📄 Archivo de datos creado: ${DATA_FILE}`);
    }
    
    // Ejecutar limpieza inicial
    cleanupOldRecords();
});
