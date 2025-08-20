# Integración React - API de Builds WoW

## 🎯 Funciones para tu React App

### 1. Función para Guardar Build (Compartir)

```javascript
// utils/api.js o services/buildService.js
const API_BASE_URL = 'http://localhost:3000/api';

export const saveBuild = async (buildData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        shareId: result.id,
        expiresAt: result.expiresAt
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error guardando build:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
```

### 2. Función para Cargar Build Compartida

```javascript
export const loadBuild = async (shareId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/data/${shareId}`);
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        build: result.data
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('Error cargando build:', error);
    return {
      success: false,
      error: 'Error de conexión'
    };
  }
};
```

## 🔧 Hook personalizado para Compartir

```javascript
// hooks/useShareBuild.js
import { useState } from 'react';
import { saveBuild } from '../utils/api';

export const useShareBuild = () => {
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [error, setError] = useState(null);

  const shareBuild = async (state) => {
    setIsSharing(true);
    setError(null);
    
    const buildData = {
      id: `temp_${Date.now()}`,
      name: `${state.currentClass} Build`,
      className: state.currentClass,
      assignedPoints: state.assignedPoints,
      totalPoints: state.totalPoints,
      availablePoints: state.availablePoints,
      createdAt: new Date().toISOString()
    };

    const result = await saveBuild(buildData);
    
    if (result.success) {
      // Generar URL compartible
      const url = `${window.location.origin}/build/${result.shareId}`;
      setShareUrl(url);
      
      // Copiar al clipboard automáticamente
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } else {
      setError(result.error);
    }
    
    setIsSharing(false);
    return result;
  };

  return {
    shareBuild,
    isSharing,
    shareUrl,
    error,
    clearShare: () => {
      setShareUrl(null);
      setError(null);
    }
  };
};
```

## 📱 Componente de Botón Compartir

```javascript
// components/ShareButton.jsx
import React from 'react';
import { useShareBuild } from '../hooks/useShareBuild';

const ShareButton = ({ buildState }) => {
  const { shareBuild, isSharing, shareUrl, error, clearShare } = useShareBuild();

  const handleShare = async () => {
    await shareBuild(buildState);
  };

  return (
    <div className="share-build">
      <button 
        onClick={handleShare}
        disabled={isSharing}
        className="share-btn"
      >
        {isSharing ? 'Compartiendo...' : '🔗 Compartir Build'}
      </button>
      
      {shareUrl && (
        <div className="share-success">
          <p>✅ Build compartido! URL copiada al clipboard:</p>
          <input 
            type="text" 
            value={shareUrl} 
            readOnly 
            className="share-url"
            onClick={(e) => e.target.select()}
          />
          <button onClick={clearShare}>Cerrar</button>
        </div>
      )}
      
      {error && (
        <div className="share-error">
          <p>❌ Error: {error}</p>
          <button onClick={clearShare}>Cerrar</button>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
```

## 🔍 Hook para Cargar Build Compartida

```javascript
// hooks/useLoadSharedBuild.js
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadBuild } from '../utils/api';

export const useLoadSharedBuild = () => {
  const { shareId } = useParams(); // desde React Router
  const [build, setBuild] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (shareId) {
      loadSharedBuild(shareId);
    }
  }, [shareId]);

  const loadSharedBuild = async (id) => {
    setIsLoading(true);
    setError(null);
    
    const result = await loadBuild(id);
    
    if (result.success) {
      setBuild(result.build);
    } else {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return {
    build,
    isLoading,
    error,
    shareId
  };
};
```

## 📄 Componente para Mostrar Build Compartida

```javascript
// components/SharedBuildViewer.jsx
import React, { useEffect } from 'react';
import { useLoadSharedBuild } from '../hooks/useLoadSharedBuild';

const SharedBuildViewer = ({ onLoadBuild }) => {
  const { build, isLoading, error, shareId } = useLoadSharedBuild();

  useEffect(() => {
    if (build && onLoadBuild) {
      // Cargar la build en tu estado de la aplicación
      onLoadBuild({
        currentClass: build.className,
        assignedPoints: build.assignedPoints,
        totalPoints: build.totalPoints,
        availablePoints: build.availablePoints
      });
    }
  }, [build, onLoadBuild]);

  if (isLoading) {
    return <div>🔄 Cargando build compartida...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <h3>❌ Error cargando build</h3>
        <p>{error}</p>
        <p>La build puede haber expirado (2 horas máximo)</p>
      </div>
    );
  }

  if (build) {
    return (
      <div className="shared-build-info">
        <h3>📋 Build Compartida Cargada</h3>
        <p><strong>Nombre:</strong> {build.name}</p>
        <p><strong>Clase:</strong> {build.className}</p>
        <p><strong>Puntos Totales:</strong> {build.totalPoints}</p>
        <p><strong>Expira:</strong> {new Date(build.expiresAt).toLocaleString()}</p>
      </div>
    );
  }

  return null;
};

export default SharedBuildViewer;
```

## 🛣️ Configuración de React Router

```javascript
// App.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TalentCalculator from './components/TalentCalculator';
import SharedBuildViewer from './components/SharedBuildViewer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TalentCalculator />} />
        <Route 
          path="/build/:shareId" 
          element={
            <TalentCalculator>
              <SharedBuildViewer onLoadBuild={handleLoadSharedBuild} />
            </TalentCalculator>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
```

## 🚀 Usar en tu componente principal

```javascript
// En tu componente principal
import ShareButton from './components/ShareButton';

const TalentCalculator = () => {
  const [buildState, setBuildState] = useState({
    currentClass: 'Warrior',
    assignedPoints: {},
    totalPoints: 0,
    availablePoints: 51
  });

  return (
    <div>
      {/* Tu calculadora de talentos */}
      
      {/* Botón para compartir */}
      <ShareButton buildState={buildState} />
    </div>
  );
};
```

## 🔄 Reiniciar servidor con CORS

```bash
# Detener servidor actual si está corriendo
pkill -f "node server.js"

# Iniciar con soporte CORS
npm start
```

¡Listo! Ahora tu React app puede compartir y cargar builds perfectamente con la API.
