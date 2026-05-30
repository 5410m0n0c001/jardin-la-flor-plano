/**
 * elements.js
 * Definición y configuración de los elementos iniciales y futuros para el Salón Jardín La Flor.
 * El plano completo se ha expandido a 40m x 40m para proveer un espacio exterior flexible en blanco.
 * El salón techado de 16m x 20m se posiciona exactamente en el centro del terreno.
 */

// Dimensiones totales del lienzo/terreno (en metros)
export const CANVAS_WIDTH = 40.0;
export const CANVAS_HEIGHT = 40.0;

// Posicionamiento del Salón Techado en el centro del terreno
export const SALON_X = 12.0;  // Comienza en 12m (deja 12m a la izquierda y 12m a la derecha)
export const SALON_Y = 10.0;  // Comienza en 10m (deja 10m arriba y 10m abajo)
export const SALON_WIDTH = 16.0;
export const SALON_HEIGHT = 20.0;

// Lista de elementos iniciales desplazados hacia el centro del terreno
export const INITIAL_ELEMENTS = [
  // 1. El Jardín (Extremo izquierdo del salón techado: SALON_X + 1.75 = 13.75)
  {
    id: "garden-1",
    type: "garden",
    name: "Jardín Lateral",
    x: 13.75, // Desplazado
    y: 20.0,  // Desplazado
    w: 2.5,
    h: 19.0,
    shape: "rectangle",
    rotation: 0,
    color: "#2e7d32",
    editable: true,
    removable: false
  },
  
  // 2. Cocina / Barra (Parte superior del salón techado)
  {
    id: "bar-1",
    type: "bar",
    name: "Cocina / Barra",
    x: 20.5,  // Desplazado
    y: 11.25, // Desplazado
    w: 9.0,
    h: 1.5,
    shape: "rectangle",
    rotation: 0,
    color: "#8d6e63",
    editable: true,
    removable: false
  },

  // 3. Pista de Baile (Centro del salón techado)
  {
    id: "dancefloor-1",
    type: "dancefloor",
    name: "Pista de Baile (AP)",
    x: 21.0, // Desplazado
    y: 23.0, // Desplazado
    w: 5.5,
    h: 5.0,
    shape: "rectangle",
    rotation: 0,
    color: "#a78bfa",
    editable: true,
    removable: false
  },

  // 4. Área de DJ (Parte inferior del salón techado)
  {
    id: "dj-1",
    type: "dj",
    name: "Área de DJ",
    x: 21.0,  // Desplazado
    y: 27.5, // Desplazado
    w: 5.0,
    h: 1.5,
    shape: "rectangle",
    rotation: 0,
    color: "#1e1b4b",
    editable: true,
    removable: false
  },

  // 5. Mesa de Quinceañera (XV) (A la derecha de la pista)
  {
    id: "table-xv",
    type: "table",
    name: "XV - Mesa de Honor",
    x: 26.5, // Desplazado
    y: 23.0, // Desplazado
    w: 1.2,
    h: 3.5,
    shape: "rectangle",
    rotation: 0,
    chairs: 10,
    color: "#f472b6",
    editable: true,
    removable: true
  },

  // --- FILA 1 DE MESAS (Top del salón techado) ---
  { id: "table-1", type: "table", name: "Mesa 1", x: 16.8, y: 14.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-2", type: "table", name: "Mesa 2", x: 18.8, y: 14.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-3", type: "table", name: "Mesa 3", x: 20.8, y: 14.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-4", type: "table", name: "Mesa 4", x: 22.8, y: 14.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-5", type: "table", name: "Mesa 5", x: 24.8, y: 14.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },

  // --- FILA 2 DE MESAS (Centro-superior del salón techado) ---
  { id: "table-6", type: "table", name: "Mesa 6", x: 16.2, y: 17.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-7", type: "table", name: "Mesa 7", x: 17.9, y: 17.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-8", type: "table", name: "Mesa 8", x: 19.6, y: 17.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-9", type: "table", name: "Mesa 9", x: 21.3, y: 17.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-10", type: "table", name: "Mesa 10", x: 23.0, y: 17.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-11", type: "table", name: "Mesa 11", x: 24.7, y: 17.2, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },

  // --- MESAS LATERALES (A la izquierda de la pista de baile) ---
  { id: "table-12", type: "table", name: "Mesa 12", x: 16.8, y: 21.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true },
  { id: "table-13", type: "table", name: "Mesa 13", x: 16.8, y: 24.5, w: 1.4, h: 1.4, shape: "square", rotation: 0, chairs: 10, color: "#d97706", editable: true, removable: true }
];

// Plantillas de elementos futuros que se pueden colocar alrededor del salón
export const FUTURE_ELEMENTS_TEMPLATES = [
  {
    type: "parking",
    name: "Estacionamiento",
    w: 8.0,
    h: 5.0,
    shape: "rectangle",
    color: "#6b7280",
    chairs: 0,
    icon: "car"
  },
  {
    type: "chapel",
    name: "Capilla",
    w: 5.0,
    h: 7.0,
    shape: "rectangle",
    color: "#f59e0b",
    chairs: 0,
    icon: "church"
  },
  {
    type: "bathrooms",
    name: "Baños Generales",
    w: 4.0,
    h: 3.0,
    shape: "rectangle",
    color: "#06b6d4",
    chairs: 0,
    icon: "restroom"
  },
  {
    type: "entrance",
    name: "Entrada Principal",
    w: 3.0,
    h: 1.0,
    shape: "rectangle",
    color: "#10b981",
    chairs: 0,
    icon: "door-open"
  },
  {
    type: "exit",
    name: "Salida de Emergencia",
    w: 2.5,
    h: 0.8,
    shape: "rectangle",
    color: "#ef4444",
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
  },
  {
    type: "reception",
    name: "Recepción",
    w: 3.0,
    h: 1.5,
    shape: "rectangle",
    color: "#6366f1",
    chairs: 0,
    icon: "bell"
  },
  {
    type: "second_bar",
    name: "Segunda Barra",
    w: 5.0,
    h: 1.5,
    shape: "rectangle",
    color: "#7c2d12",
    chairs: 0,
    icon: "cocktail"
  },
  {
    type: "second_dj",
    name: "Segundo DJ / Audio",
    w: 4.0,
    h: 1.5,
    shape: "rectangle",
    color: "#312e81",
    chairs: 0,
    icon: "music"
  },
  {
    type: "lounge",
    name: "Sala Lounge",
    w: 3.0,
    h: 3.0,
    shape: "rectangle",
    color: "#db2777",
    chairs: 0,
    icon: "couch"
  },
  {
    type: "table_umbrella",
    name: "Mesa con Sombrilla",
    w: 2.0,
    h: 2.0,
    shape: "circle",
    color: "#0284c7",
    chairs: 6,
    icon: "umbrella"
  }
];
