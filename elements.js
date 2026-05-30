/**
 * elements.js
 * Definición y configuración de los elementos iniciales y futuros para el Salón Jardín La Flor.
 * Todos los tamaños y coordenadas están expresados en metros (m) para precisión arquitectónica.
 */

// Dimensiones por defecto del lienzo/terreno (en metros)
export const CANVAS_WIDTH = 16.0;
export const CANVAS_HEIGHT = 20.0;

// Lista de elementos iniciales basados exactamente en la distribución de jfv3.png
export const INITIAL_ELEMENTS = [
  // 1. El Jardín (Extremo izquierdo)
  {
    id: "garden-1",
    type: "garden",
    name: "Jardín Lateral",
    x: 1.75, // Centro X: (0.5 + 3.0)/2
    y: 10.0, // Centro Y: (0.5 + 19.5)/2
    w: 2.5,  // Ancho en metros
    h: 19.0, // Alto en metros
    shape: "rectangle",
    rotation: 0,
    color: "#2e7d32",
    editable: true,
    removable: false
  },
  
  // 2. Cocina / Barra (Parte superior)
  {
    id: "bar-1",
    type: "bar",
    name: "Cocina / Barra",
    x: 8.5,  // Centrado horizontalmente en la sección de mesas (entre x=3.5 y x=15.5)
    y: 1.25, // Centro Y
    w: 9.0,  // Ancho en metros
    h: 1.5,  // Alto en metros
    shape: "rectangle",
    rotation: 0,
    color: "#8d6e63",
    editable: true,
    removable: false
  },

  // 3. Pista de Baile (Centro)
  {
    id: "dancefloor-1",
    type: "dancefloor",
    name: "Pista de Baile (AP)",
    x: 9.0,  // Centrado horizontalmente
    y: 13.0, // Centro Y
    w: 5.5,  // Ancho en metros
    h: 5.0,  // Alto en metros
    shape: "rectangle",
    rotation: 0,
    color: "#a78bfa", // Púrpura pastel o madera
    editable: true,
    removable: false
  },

  // 4. Área de DJ (Parte inferior central)
  {
    id: "dj-1",
    type: "dj",
    name: "Área de DJ",
    x: 9.0,
    y: 17.5,
    w: 5.0,
    h: 1.5,
    shape: "rectangle",
    rotation: 0,
    color: "#1e1b4b", // Azul muy oscuro
    editable: true,
    removable: false
  },

  // 5. Mesa de Quinceañera (XV) (Rectangular, a la derecha de la pista)
  {
    id: "table-xv",
    type: "table",
    name: "XV - Mesa de Honor",
    x: 14.5,
    y: 13.0,
    w: 1.2,
    h: 3.5,
    shape: "rectangle",
    rotation: 0,
    chairs: 10,
    color: "#f472b6", // Rosa suave para XV
    editable: true,
    removable: true
  },

  // --- FILA 1 DE MESAS (Top, abajo de la cocina/barra) ---
  { id: "table-1", type: "table", name: "Mesa 1", x: 4.8, y: 4.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-2", type: "table", name: "Mesa 2", x: 6.8, y: 4.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-3", type: "table", name: "Mesa 3", x: 8.8, y: 4.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-4", type: "table", name: "Mesa 4", x: 10.8, y: 4.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-5", type: "table", name: "Mesa 5", x: 12.8, y: 4.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },

  // --- FILA 2 DE MESAS (Centro-superior) ---
  { id: "table-6", type: "table", name: "Mesa 6", x: 4.2, y: 7.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-7", type: "table", name: "Mesa 7", x: 5.9, y: 7.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-8", type: "table", name: "Mesa 8", x: 7.6, y: 7.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-9", type: "table", name: "Mesa 9", x: 9.3, y: 7.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-10", type: "table", name: "Mesa 10", x: 11.0, y: 7.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-11", type: "table", name: "Mesa 11", x: 12.7, y: 7.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },

  // --- MESAS LATERALES (A la izquierda de la pista de baile) ---
  { id: "table-12", type: "table", name: "Mesa 12", x: 4.8, y: 11.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-13", type: "table", name: "Mesa 13", x: 4.8, y: 14.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true }
];

// Plantillas de elementos futuros que se pueden arrastrar o añadir al plano exterior
export const FUTURE_ELEMENTS_TEMPLATES = [
  {
    type: "parking",
    name: "Estacionamiento",
    w: 8.0,
    h: 5.0,
    shape: "rectangle",
    color: "#6b7280", // Gris asfalto
    chairs: 0,
    icon: "car"
  },
  {
    type: "chapel",
    name: "Capilla",
    w: 5.0,
    h: 7.0,
    shape: "rectangle",
    color: "#f59e0b", // Dorado/ocre sacro
    chairs: 0,
    icon: "church"
  },
  {
    type: "bathrooms",
    name: "Baños Generales",
    w: 4.0,
    h: 3.0,
    shape: "rectangle",
    color: "#06b6d4", // Turquesa
    chairs: 0,
    icon: "restroom"
  },
  {
    type: "entrance",
    name: "Entrada Principal",
    w: 3.0,
    h: 1.0,
    shape: "rectangle",
    color: "#10b981", // Verde brillante
    chairs: 0,
    icon: "door-open"
  },
  {
    type: "exit",
    name: "Salida de Emergencia",
    w: 2.5,
    h: 0.8,
    shape: "rectangle",
    color: "#ef4444", // Rojo peligro
    chairs: 0,
    icon: "sign-out-alt"
  },
  {
    type: "table_square",
    name: "Mesa Cuadrada (10p)",
    w: 1.4,
    h: 1.4,
    shape: "square",
    color: "#d97706",
    chairs: 10,
    icon: "square"
  },
  {
    type: "table_round",
    name: "Mesa Redonda (10p)",
    w: 1.5,
    h: 1.5,
    shape: "circle",
    color: "#059669",
    chairs: 10,
    icon: "circle"
  }
];
