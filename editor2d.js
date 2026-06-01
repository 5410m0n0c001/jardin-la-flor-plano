/**
 * editor2d.js
 * Módulo para el Canvas SVG interactivo en 2D.
 * Maneja el renderizado de los elementos en escala real (1m = 40px),
 * el arrastre (drag-and-drop), selección, ajuste a rejilla y creación.
 */

const SCALE = 40; // 1 metro = 40 píxeles
let activeSvg = null;
let currentElements = [];
let selectedElementId = null;
let isDragging = false;
let dragTarget = null;
let dragOffset = { x: 0, y: 0 };
let useGrid = true;
const GRID_SNAP_VAL = 0.1; // Ajuste a rejilla cada 10 cm (0.1m)

// Variables de Zoom y Panning (Desplazamiento)
let zoom = 1.0;
let pan = { x: 0, y: 0 };
let isPanning = false;
let startPan = { x: 0, y: 0 };

// Callbacks para comunicar eventos con app.js
let onSelectedCallback = null;
let onMovedCallback = null;

/**
 * Inicializa el editor 2D
 */
export function init2D(svgElement, initialElements, onSelected, onMoved) {
  activeSvg = svgElement;
  currentElements = initialElements;
  onSelectedCallback = onSelected;
  onMovedCallback = onMoved;
  
  setupCanvasEvents();
  render();
}

/**
 * Activa/Desactiva el ajuste magnético a rejilla
 */
export function setGridSnap(active) {
  useGrid = active;
  const gridPattern = document.getElementById("canvas-grid");
  if (gridPattern) {
    gridPattern.style.opacity = active ? "1" : "0";
  }
}

/**
 * Actualiza la lista de elementos y re-renderiza el plano 2D
 */
export function updateElements2D(elementsArray) {
  currentElements = elementsArray;
  render();
}

/**
 * Establece el elemento seleccionado en el editor 2D
 */
export function selectElement2D(elementId) {
  selectedElementId = elementId;
  
  // Actualizar clases CSS en SVG sin volver a renderizar todo
  const allGroups = activeSvg.querySelectorAll(".draggable");
  allGroups.forEach(g => {
    if (g.getAttribute("data-id") === elementId) {
      g.classList.add("selected");
    } else {
      g.classList.remove("selected");
    }
  });
}

/**
 * Convierte coordenadas del ratón a metros reales del plano SVG,
 * considerando el zoom y desplazamiento (pan) aplicados al plano.
 */
function getMouseCoords(evt) {
  const rect = activeSvg.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  
  // viewBox ampliado a 1600x1600 px para terreno de 40m x 40m
  const svgX = (x / rect.width) * 1600;
  const svgY = (y / rect.height) * 1600;
  
  // Transformación inversa considerando el zoom y desplazamiento del plano
  const mX = (svgX - pan.x) / (zoom * SCALE);
  const mY = (svgY - pan.y) / (zoom * SCALE);
  
  return {
    mX: parseFloat(mX.toFixed(2)),
    mY: parseFloat(mY.toFixed(2))
  };
}

/**
 * Aplica visualmente la matriz de transformación SVG de escala y traslación
 */
function applyZoomPan() {
  const zoomGroup = document.getElementById("svg-zoom-group");
  if (zoomGroup) {
    zoomGroup.setAttribute("transform", `translate(${pan.x}, ${pan.y}) scale(${zoom})`);
  }
}

/**
 * Funciones exportadas de zoom y centrado para la interfaz HUD
 */
export function zoomIn() {
  const oldZoom = zoom;
  zoom = Math.min(3.0, zoom + 0.15);
  // Zoom centrado en el centro geométrico del canvas (800, 800)
  pan.x = 800 - (800 - pan.x) * (zoom / oldZoom);
  pan.y = 800 - (800 - pan.y) * (zoom / oldZoom);
  applyZoomPan();
}

export function zoomOut() {
  const oldZoom = zoom;
  zoom = Math.max(0.5, zoom - 0.15);
  // Zoom centrado en el centro geométrico del canvas (800, 800)
  pan.x = 800 - (800 - pan.x) * (zoom / oldZoom);
  pan.y = 800 - (800 - pan.y) * (zoom / oldZoom);
  applyZoomPan();
}

export function resetZoom() {
  zoom = 1.0;
  pan.x = 0;
  pan.y = 0;
  applyZoomPan();
}

/**
 * Configura los eventos del ratón/táctil para interactividad
 */
function setupCanvasEvents() {
  // 1. Mostrar coordenadas en el HUD en tiempo real
  activeSvg.addEventListener("mousemove", (evt) => {
    const coords = getMouseCoords(evt);
    const coordHud = document.getElementById("coord-hud");
    if (coords.mX >= 0 && coords.mX <= 40 && coords.mY >= 0 && coords.mY <= 40) {
      if (coordHud) {
        coordHud.innerHTML = `<i class="fa-solid fa-crosshairs"></i> X: ${coords.mX.toFixed(1)}m, Y: ${coords.mY.toFixed(1)}m`;
      }
    }
  });
  
  // 2. Deseleccionar elementos al hacer clic en el fondo
  activeSvg.addEventListener("click", (evt) => {
    const draggable = evt.target.closest(".draggable");
    if (!draggable) {
      selectedElementId = null;
      if (onSelectedCallback) onSelectedCallback(null);
      render();
    }
  });

  // 3. Zoom mediante la rueda del ratón (Wheel) centrado en el puntero del mouse
  activeSvg.addEventListener("wheel", (evt) => {
    evt.preventDefault();
    const oldZoom = zoom;
    const zoomIntensity = 0.08;
    
    // Obtener la posición del mouse relativa al SVG
    const rect = activeSvg.getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    
    // Traducir a coordenadas dentro del viewBox de 1600x1600
    const x_f = (mouseX / rect.width) * 1600;
    const y_f = (mouseY / rect.height) * 1600;
    
    if (evt.deltaY < 0) {
      zoom = Math.min(3.0, zoom + zoomIntensity);
    } else {
      zoom = Math.max(0.5, zoom - zoomIntensity);
    }
    
    // Ajustar el desplazamiento (pan) para mantener el foco bajo el puntero
    pan.x = x_f - (x_f - pan.x) * (zoom / oldZoom);
    pan.y = y_f - (y_f - pan.y) * (zoom / oldZoom);
    
    applyZoomPan();
  }, { passive: false });

  // 4. Desplazamiento del lienzo 2D (Panning) - Desktop
  activeSvg.addEventListener("mousedown", (evt) => {
    const draggable = evt.target.closest(".draggable");
    // Activamos paneo solo si NO estamos haciendo clic sobre un elemento interactivo
    if (!draggable) {
      isPanning = true;
      startPan.x = evt.clientX - pan.x;
      startPan.y = evt.clientY - pan.y;
      activeSvg.style.cursor = "grabbing";
      
      const onWindowMouseMovePan = (moveEvt) => {
        if (isPanning) {
          pan.x = moveEvt.clientX - startPan.x;
          pan.y = moveEvt.clientY - startPan.y;
          applyZoomPan();
        }
      };
      
      const onWindowMouseUpPan = () => {
        isPanning = false;
        activeSvg.style.cursor = "default";
        window.removeEventListener("mousemove", onWindowMouseMovePan);
        window.removeEventListener("mouseup", onWindowMouseUpPan);
      };
      
      window.addEventListener("mousemove", onWindowMouseMovePan);
      window.addEventListener("mouseup", onWindowMouseUpPan);
    }
  });

  // 5. Desplazamiento del lienzo 2D (Panning) - Móvil táctil
  activeSvg.addEventListener("touchstart", (evt) => {
    if (evt.touches.length > 1) return;
    const touch = evt.touches[0];
    const draggable = touch.target.closest(".draggable");
    
    // Paneo en móvil si no toca un elemento arrastrable
    if (!draggable) {
      isPanning = true;
      startPan.x = touch.clientX - pan.x;
      startPan.y = touch.clientY - pan.y;
      
      const onWindowTouchMovePan = (moveEvt) => {
        if (isPanning && moveEvt.touches.length === 1) {
          const moveTouch = moveEvt.touches[0];
          pan.x = moveTouch.clientX - startPan.x;
          pan.y = moveTouch.clientY - startPan.y;
          applyZoomPan();
        }
      };
      
      const onWindowTouchEndPan = () => {
        isPanning = false;
        window.removeEventListener("touchmove", onWindowTouchMovePan);
        window.removeEventListener("touchend", onWindowTouchEndPan);
      };
      
      window.addEventListener("touchmove", onWindowTouchMovePan, { passive: true });
      window.addEventListener("touchend", onWindowTouchEndPan);
    }
  });
}

/**
 * Dibuja todos los elementos en el Canvas SVG
 */
function render() {
  const elementsGroup = document.getElementById("svg-elements-group");
  if (!elementsGroup) return;
  
  elementsGroup.innerHTML = ""; // Limpiar antes de re-dibujar
  
  currentElements.forEach(elem => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const typeClass = elem.type === "bar" ? "kitchen-bar" : elem.type;
    group.setAttribute("class", `draggable ${typeClass}`);
    group.setAttribute("data-id", elem.id);
    group.setAttribute("transform", `translate(${elem.x * SCALE}, ${elem.y * SCALE}) rotate(${elem.rotation || 0})`);
    
    if (elem.id === selectedElementId) {
      group.classList.add("selected");
    }
    
    // Crear la forma base según el tipo y diseño
    switch (elem.type) {
      case "garden":
        renderGarden(group, elem);
        break;
      case "bar":
        renderBar(group, elem);
        break;
      case "dancefloor":
        renderDancefloor(group, elem);
        break;
      case "dj":
        renderDJ(group, elem);
        break;
      case "table":
        renderTable(group, elem);
        break;
      default:
        renderGenericElement(group, elem);
        break;
    }
    
    // Agregar manejadores de eventos de arrastre a cada grupo de elementos
    setupDragEvents(group, elem);
    
    elementsGroup.appendChild(group);
  });
}

/**
 * Configura los eventos de arrastre para un grupo
 */
function setupDragEvents(group, elem) {
  // A) Arrastre con ratón (Desktop)
  group.addEventListener("mousedown", (evt) => {
    evt.stopPropagation();
    
    const startX = evt.clientX;
    const startY = evt.clientY;
    let hasMoved = false;
    
    isDragging = true;
    dragTarget = elem;
    
    const mouseCoords = getMouseCoords(evt);
    dragOffset.x = mouseCoords.mX - elem.x;
    dragOffset.y = mouseCoords.mY - elem.y;
    
    const onMouseMove = (moveEvt) => {
      if (!isDragging || !dragTarget) return;
      
      const distance = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY);
      // Solo consideramos que hay movimiento real si se desplaza más de 4px
      if (distance > 4) {
        hasMoved = true;
        const rect = activeSvg.getBoundingClientRect();
        const x = moveEvt.clientX - rect.left;
        const y = moveEvt.clientY - rect.top;
        updateDragPosition(x, y, rect);
      }
    };
    
    const onMouseUp = () => {
      isDragging = false;
      dragTarget = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      
      selectedElementId = elem.id;
      selectElement2D(elem.id);
      
      if (!hasMoved) {
        // Clic sin arrastrar: selecciona y abre de forma interactiva el panel
        if (onSelectedCallback) onSelectedCallback(elem, true);
      } else {
        // Se arrastró: selecciona silenciosamente sin abrir el panel de móvil de forma molesta
        if (onSelectedCallback) onSelectedCallback(elem, false);
      }
      render(); // Re-dibujar completo para acomodar sillas
    };
    
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  // B) Arrastre táctil (Móvil)
  group.addEventListener("touchstart", (evt) => {
    if (evt.touches.length > 1) return; // Ignorar multi-touch
    evt.stopPropagation();
    
    const touch = evt.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    let hasMoved = false;
    
    isDragging = true;
    dragTarget = elem;
    
    const fakeEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY
    };
    
    const mouseCoords = getMouseCoords(fakeEvent);
    dragOffset.x = mouseCoords.mX - elem.x;
    dragOffset.y = mouseCoords.mY - elem.y;
    
    const onTouchMove = (moveEvt) => {
      if (!isDragging || !dragTarget || moveEvt.touches.length === 0) return;
      const moveTouch = moveEvt.touches[0];
      
      const distance = Math.hypot(moveTouch.clientX - startX, moveTouch.clientY - startY);
      if (distance > 5) {
        hasMoved = true;
        moveEvt.preventDefault(); // Evitar scroll táctil del navegador al arrastrar
        
        const rect = activeSvg.getBoundingClientRect();
        const x = moveTouch.clientX - rect.left;
        const y = moveTouch.clientY - rect.top;
        updateDragPosition(x, y, rect);
      }
    };
    
    const onTouchEnd = () => {
      isDragging = false;
      dragTarget = null;
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      
      selectedElementId = elem.id;
      selectElement2D(elem.id);
      
      if (!hasMoved) {
        // Tap simple: abre las propiedades y despliega el cajón
        if (onSelectedCallback) onSelectedCallback(elem, true);
      } else {
        // Desplazamiento táctil finalizado: selecciona de forma silenciosa
        if (onSelectedCallback) onSelectedCallback(elem, false);
      }
      render();
    };
    
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  });
}

function updateDragPosition(clientX, clientY, rect) {
  const svgX = (clientX / rect.width) * 1600;
  const svgY = (clientY / rect.height) * 1600;
  
  // Traducir coordenadas de ratón considerando zoom y desplazamiento (pan)
  let zoomX = (svgX - pan.x) / zoom;
  let zoomY = (svgY - pan.y) / zoom;
  
  let newX = zoomX / SCALE - dragOffset.x;
  let newY = zoomY / SCALE - dragOffset.y;
  
  // Limitar dentro de los bordes totales del terreno (40m x 40m)
  const maxW = 40.0;
  const maxH = 40.0;
  const elementRadiusW = dragTarget.shape === "circle" ? dragTarget.w / 2 : dragTarget.w / 2;
  const elementRadiusH = dragTarget.shape === "circle" ? dragTarget.w / 2 : dragTarget.h / 2;
  
  newX = Math.max(elementRadiusW, Math.min(maxW - elementRadiusW, newX));
  newY = Math.max(elementRadiusH, Math.min(maxH - elementRadiusH, newY));
  
  // Ajuste magnético a rejilla (Grid Snapping)
  if (useGrid) {
    newX = Math.round(newX / GRID_SNAP_VAL) * GRID_SNAP_VAL;
    newY = Math.round(newY / GRID_SNAP_VAL) * GRID_SNAP_VAL;
  }
  
  newX = parseFloat(newX.toFixed(2));
  newY = parseFloat(newY.toFixed(2));
  
  // Modificar coordenadas de datos
  dragTarget.x = newX;
  dragTarget.y = newY;
  
  // Actualizar la transformación en SVG de forma ultra veloz
  const g = activeSvg.querySelector(`.draggable[data-id="${dragTarget.id}"]`);
  if (g) {
    g.setAttribute("transform", `translate(${newX * SCALE}, ${newY * SCALE}) rotate(${dragTarget.rotation || 0})`);
  }
  
  // Notificar cambio
  if (onMovedCallback) {
    onMovedCallback(dragTarget);
  }
}


/* ==========================================
   MÉTODOS DE RENDERIZADO SVG DE COMPONENTES
   ========================================== */

// 1. Renderizar el Jardín
function renderGarden(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  // Rectángulo verde de fondo con patrón de pasto
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", -wPx/2);
  rect.setAttribute("y", -hPx/2);
  rect.setAttribute("width", wPx);
  rect.setAttribute("height", hPx);
  rect.setAttribute("fill", "url(#grass-pattern)");
  rect.setAttribute("rx", "12");
  rect.setAttribute("stroke", "#1b4332");
  rect.setAttribute("stroke-width", "2");
  group.appendChild(rect);
  
  // Dibujar arbustos decorativos en los bordes para una mejor estética
  const spacing = 16;
  // Bordes laterales
  for (let y = -hPx/2 + 10; y < hPx/2; y += spacing) {
    // Izquierda
    const circleLeft = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circleLeft.setAttribute("cx", -wPx/2 + 5);
    circleLeft.setAttribute("cy", y);
    circleLeft.setAttribute("r", 8 + Math.random() * 3);
    circleLeft.setAttribute("fill", "#1e5e3a");
    circleLeft.setAttribute("opacity", "0.95");
    group.appendChild(circleLeft);
    
    // Derecha
    const circleRight = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circleRight.setAttribute("cx", wPx/2 - 5);
    circleRight.setAttribute("cy", y);
    circleRight.setAttribute("r", 8 + Math.random() * 3);
    circleRight.setAttribute("fill", "#1e5e3a");
    circleRight.setAttribute("opacity", "0.95");
    group.appendChild(circleRight);
  }
  
  // Texto identificador
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("class", "label-element");
  text.setAttribute("y", 0);
  text.setAttribute("font-size", "14px");
  text.setAttribute("transform", "rotate(-90)"); // Vertical como en la imagen
  text.textContent = elem.name;
  group.appendChild(text);
}

// 2. Renderizar Cocina / Barra
function renderBar(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  // Fondo de barra en café madera
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", -wPx/2);
  rect.setAttribute("y", -hPx/2);
  rect.setAttribute("width", wPx);
  rect.setAttribute("height", hPx);
  rect.setAttribute("fill", "#3e2723");
  rect.setAttribute("stroke", "#bcaaa4");
  rect.setAttribute("stroke-width", "3");
  rect.setAttribute("rx", "4");
  group.appendChild(rect);
  
  // Encimera interior (mármol beige)
  const innerRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  innerRect.setAttribute("x", -wPx/2 + 6);
  innerRect.setAttribute("y", -hPx/2 + 6);
  innerRect.setAttribute("width", wPx - 12);
  innerRect.setAttribute("height", hPx - 12);
  innerRect.setAttribute("fill", "#efebe9");
  innerRect.setAttribute("stroke", "#bcaaa4");
  innerRect.setAttribute("stroke-width", "1");
  innerRect.setAttribute("rx", "2");
  group.appendChild(innerRect);
  
  // Dibujar un fregadero simple en la izquierda (como en jfv3.png)
  const sink = document.createElementNS("http://www.w3.org/2000/svg", "g");
  sink.setAttribute("transform", `translate(${-wPx/3}, 0)`);
  
  const sinkOuter = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  sinkOuter.setAttribute("x", -15);
  sinkOuter.setAttribute("y", -10);
  sinkOuter.setAttribute("width", 30);
  sinkOuter.setAttribute("height", 20);
  sinkOuter.setAttribute("fill", "#cfd8dc");
  sinkOuter.setAttribute("stroke", "#78909c");
  sinkOuter.setAttribute("stroke-width", "1.5");
  sinkOuter.setAttribute("rx", "3");
  
  const sinkInner = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  sinkInner.setAttribute("x", -10);
  sinkInner.setAttribute("y", -6);
  sinkInner.setAttribute("width", 20);
  sinkInner.setAttribute("height", 12);
  sinkInner.setAttribute("fill", "#90a4ae");
  sinkInner.setAttribute("rx", "1");
  
  sink.appendChild(sinkOuter);
  sink.appendChild(sinkInner);
  group.appendChild(sink);
  
  // Texto
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("class", "label-element");
  text.setAttribute("x", 40);
  text.setAttribute("y", 0);
  text.setAttribute("fill", "#3e2723");
  text.setAttribute("font-size", "11px");
  text.textContent = elem.name.toUpperCase();
  group.appendChild(text);
}

// 3. Renderizar Pista de Baile
function renderDancefloor(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  // Pista de baile en madera de tonos dorados/ocres
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", -wPx/2);
  rect.setAttribute("y", -hPx/2);
  rect.setAttribute("width", wPx);
  rect.setAttribute("height", hPx);
  rect.setAttribute("fill", "#b45309"); // Ocre
  rect.setAttribute("stroke", "#d97706");
  rect.setAttribute("stroke-width", "3");
  rect.setAttribute("rx", "4");
  rect.setAttribute("filter", "url(#drop-shadow)");
  group.appendChild(rect);
  
  // Tablones de madera internos (dibujados mediante líneas)
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const lineX = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lineX.setAttribute("x1", -wPx/2 + (wPx / steps) * i);
    lineX.setAttribute("y1", -hPx/2);
    lineX.setAttribute("x2", -wPx/2 + (wPx / steps) * i);
    lineX.setAttribute("y2", hPx/2);
    lineX.setAttribute("stroke", "rgba(0,0,0,0.18)");
    lineX.setAttribute("stroke-width", "1");
    group.appendChild(lineX);
    
    const lineY = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lineY.setAttribute("x1", -wPx/2);
    lineY.setAttribute("y1", -hPx/2 + (hPx / steps) * i);
    lineY.setAttribute("x2", wPx/2);
    lineY.setAttribute("y2", -hPx/2 + (hPx / steps) * i);
    lineY.setAttribute("stroke", "rgba(0,0,0,0.18)");
    lineY.setAttribute("stroke-width", "1");
    group.appendChild(lineY);
  }
  
  // Siglas AP y Texto PISTA DE BAILE
  const apText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  apText.setAttribute("class", "label-element");
  apText.setAttribute("y", -10);
  apText.setAttribute("font-size", "22px");
  apText.setAttribute("font-weight", "800");
  apText.setAttribute("fill", "rgba(255,255,255,0.9)");
  apText.textContent = "AP";
  group.appendChild(apText);
  
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("class", "label-element");
  text.setAttribute("y", 15);
  text.setAttribute("font-size", "9px");
  text.setAttribute("fill", "rgba(255,255,255,0.75)");
  text.textContent = "PISTA DE BAILE";
  group.appendChild(text);
}

// 4. Renderizar Cabina DJ
function renderDJ(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  // Escenario
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", -wPx/2);
  rect.setAttribute("y", -hPx/2);
  rect.setAttribute("width", wPx);
  rect.setAttribute("height", hPx);
  rect.setAttribute("fill", "#1e1e2f");
  rect.setAttribute("stroke", "#d4af37");
  rect.setAttribute("stroke-width", "2");
  rect.setAttribute("rx", "6");
  group.appendChild(rect);
  
  // Cabina de DJ
  const booth = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  booth.setAttribute("x", -wPx/4);
  booth.setAttribute("y", -hPx/3);
  booth.setAttribute("width", wPx/2);
  booth.setAttribute("height", hPx/1.5);
  booth.setAttribute("fill", "#0f172a");
  booth.setAttribute("stroke", "#475569");
  booth.setAttribute("stroke-width", "1");
  booth.setAttribute("rx", "2");
  group.appendChild(booth);
  
  // Bafles / Altavoces (Izquierda y Derecha)
  const spkLeft = createSpeaker(-wPx/2 + 20);
  const spkRight = createSpeaker(wPx/2 - 20);
  group.appendChild(spkLeft);
  group.appendChild(spkRight);
  
  // Decoración de Plantas en maceta a los lados de los altavoces
  const plantL = createPotPlant(-wPx/2 + 45);
  const plantR = createPotPlant(wPx/2 - 45);
  group.appendChild(plantL);
  group.appendChild(plantR);
  
  // Textos
  const textTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  textTitle.setAttribute("class", "label-element");
  textTitle.setAttribute("y", -3);
  textTitle.setAttribute("font-size", "14px");
  textTitle.setAttribute("fill", "#d4af37");
  textTitle.textContent = "DJ";
  group.appendChild(textTitle);
  
  const textSub = document.createElementNS("http://www.w3.org/2000/svg", "text");
  textSub.setAttribute("class", "label-element");
  textSub.setAttribute("y", 12);
  textSub.setAttribute("font-size", "7px");
  textSub.setAttribute("fill", "#94a3b8");
  textSub.textContent = "ÁREA DE DJ";
  group.appendChild(textSub);
}

function createSpeaker(xPos) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", `translate(${xPos}, 0)`);
  
  const main = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  main.setAttribute("x", -10);
  main.setAttribute("y", -15);
  main.setAttribute("width", 20);
  main.setAttribute("height", 30);
  main.setAttribute("fill", "#000");
  main.setAttribute("rx", "2");
  g.appendChild(main);
  
  const cone1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  cone1.setAttribute("cx", 0);
  cone1.setAttribute("cy", -6);
  cone1.setAttribute("r", 5);
  cone1.setAttribute("fill", "#334155");
  g.appendChild(cone1);
  
  const cone2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  cone2.setAttribute("cx", 0);
  cone2.setAttribute("cy", 6);
  cone2.setAttribute("r", 6);
  cone2.setAttribute("fill", "#334155");
  g.appendChild(cone2);
  
  return g;
}

function createPotPlant(xPos) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", `translate(${xPos}, 0)`);
  
  // Maceta
  const pot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  pot.setAttribute("cx", 0);
  pot.setAttribute("cy", 0);
  pot.setAttribute("r", 8);
  pot.setAttribute("fill", "#b45309");
  g.appendChild(pot);
  
  // Hojas
  for (let i = 0; i < 4; i++) {
    const leaf = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    leaf.setAttribute("cx", Math.sin(i * Math.PI / 2) * 5);
    leaf.setAttribute("cy", Math.cos(i * Math.PI / 2) * 5);
    leaf.setAttribute("r", 6);
    leaf.setAttribute("fill", "#15803d");
    g.appendChild(leaf);
  }
  return g;
}

// 5. Renderizar Mesas (Cuadradas y Circulares) con Sillas
function renderTable(group, elem) {
  const isCircle = elem.shape === "circle";
  const numChairs = elem.chairs || 10;
  const radius = elem.w / 2;
  const rPx = radius * SCALE;
  
  // A) Dibujar Sillas primero (para que queden debajo del tablero)
  const chairOffset = rPx + 8; // Distancia del centro de la mesa a la silla
  
  if (isCircle) {
    // Distribución circular de sillas
    for (let i = 0; i < numChairs; i++) {
      const angle = (i * 2 * Math.PI) / numChairs;
      const x = Math.sin(angle) * chairOffset;
      const y = Math.cos(angle) * chairOffset;
      
      const chair = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      chair.setAttribute("class", "chair-svg");
      chair.setAttribute("cx", x);
      chair.setAttribute("cy", y);
      chair.setAttribute("r", 6); // Radio de la silla
      group.appendChild(chair);
    }
  } else {
    // Distribución de sillas para Mesa Cuadrada / Rectangular
    // Si la mesa es cuadrada (w == h): repartir de manera equitativa por los 4 lados.
    // Para 10 sillas: 3 arriba, 3 abajo, 2 izquierda, 2 derecha.
    const wPx = elem.w * SCALE;
    const hPx = elem.h * SCALE;
    
    // Lista de posiciones de sillas relativas
    const chairsList = [];
    
    if (elem.shape === "square" && numChairs === 10) {
      // 3 arriba, 3 abajo, 2 a la izquierda, 2 a la derecha
      const offset = 10; // Desplazamiento exterior
      
      // Arriba (y = -hPx/2 - offset)
      chairsList.push({ x: -wPx/3, y: -hPx/2 - offset, rot: 0 });
      chairsList.push({ x: 0, y: -hPx/2 - offset, rot: 0 });
      chairsList.push({ x: wPx/3, y: -hPx/2 - offset, rot: 0 });
      
      // Abajo (y = hPx/2 + offset)
      chairsList.push({ x: -wPx/3, y: hPx/2 + offset, rot: 180 });
      chairsList.push({ x: 0, y: hPx/2 + offset, rot: 180 });
      chairsList.push({ x: wPx/3, y: hPx/2 + offset, rot: 180 });
      
      // Izquierda (x = -wPx/2 - offset)
      chairsList.push({ x: -wPx/2 - offset, y: -hPx/4, rot: 270 });
      chairsList.push({ x: -wPx/2 - offset, y: hPx/4, rot: 270 });
      
      // Derecha (x = wPx/2 + offset)
      chairsList.push({ x: wPx/2 + offset, y: -hPx/4, rot: 90 });
      chairsList.push({ x: wPx/2 + offset, y: hPx/4, rot: 90 });
    } else {
      // Distribución genérica basada en perímetro para formas rectangulares (ej. Quinceañera)
      // Dibujamos las sillas distribuidas por lados de forma genérica
      const offset = 9;
      const w = wPx;
      const h = hPx;
      
      if (elem.id === "table-xv") {
        // En jfv3.png la mesa de XV tiene 10 sillas orientadas linealmente de cara al salón.
        // Sillas en el lado posterior (izquierdo en vertical) y cabeceras
        // Vamos a dibujarlas rodeándola de forma uniforme para representar sus 10 sillas
        for (let i = 0; i < 4; i++) {
          chairsList.push({ x: -w/2 - offset, y: -h/3 + (h/3)*i, rot: 270 });
          chairsList.push({ x: w/2 + offset, y: -h/3 + (h/3)*i, rot: 90 });
        }
        chairsList.push({ x: 0, y: -h/2 - offset, rot: 0 });
        chairsList.push({ x: 0, y: h/2 + offset, rot: 180 });
      } else {
        // Genérica para cualquier otra mesa cuadrada/rectangular
        // 2 en cada lado corto, resto repartidas
        for (let i = 0; i < numChairs; i++) {
          const angle = (i * 2 * Math.PI) / numChairs;
          chairsList.push({
            x: Math.sin(angle) * (w/2 + offset),
            y: Math.cos(angle) * (h/2 + offset),
            rot: (angle * 180) / Math.PI
          });
        }
      }
    }
    
    // Renderizar sillas rectangulares estilizadas
    chairsList.forEach(c => {
      const chairG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      chairG.setAttribute("transform", `translate(${c.x}, ${c.y}) rotate(${c.rot})`);
      
      const chairRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      chairRect.setAttribute("class", "chair-svg");
      chairRect.setAttribute("x", -6);
      chairRect.setAttribute("y", -6);
      chairRect.setAttribute("width", 12);
      chairRect.setAttribute("height", 12);
      chairRect.setAttribute("rx", "2");
      
      // Respaldo de la silla
      const back = document.createElementNS("http://www.w3.org/2000/svg", "line");
      back.setAttribute("x1", -6);
      back.setAttribute("y1", 6);
      back.setAttribute("x2", 6);
      back.setAttribute("y2", 6);
      back.setAttribute("stroke", "#1f2937");
      back.setAttribute("stroke-width", "2");
      
      chairG.appendChild(chairRect);
      chairG.appendChild(back);
      group.appendChild(chairG);
    });
  }
  
  // B) Dibujar Tablero de la Mesa
  const board = isCircle 
    ? document.createElementNS("http://www.w3.org/2000/svg", "circle")
    : document.createElementNS("http://www.w3.org/2000/svg", "rect");
  
  const color = elem.color || "#d97706";
  
  if (isCircle) {
    board.setAttribute("cx", 0);
    board.setAttribute("cy", 0);
    board.setAttribute("r", rPx);
  } else {
    const wPx = elem.w * SCALE;
    const hPx = elem.h * SCALE;
    board.setAttribute("x", -wPx/2);
    board.setAttribute("y", -hPx/2);
    board.setAttribute("width", wPx);
    board.setAttribute("height", hPx);
    board.setAttribute("rx", "3");
  }
  
  board.setAttribute("fill", color);
  board.setAttribute("stroke", "#efebe9"); // Borde del mantel blanco
  board.setAttribute("stroke-width", "2");
  board.setAttribute("filter", "url(#drop-shadow)");
  group.appendChild(board);
  
  // C) Centro de Mesa (Plato o arreglo floral)
  const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  center.setAttribute("cx", 0);
  center.setAttribute("cy", 0);
  center.setAttribute("r", isCircle ? rPx * 0.35 : Math.min(elem.w, elem.h) * SCALE * 0.25);
  center.setAttribute("fill", "#efebe9");
  center.setAttribute("stroke", "rgba(0,0,0,0.15)");
  center.setAttribute("stroke-width", "1");
  group.appendChild(center);
  
  // Detalle de flores o sombrilla
  if (elem.name.toLowerCase().includes("sombrilla")) {
    const umbrellaGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    // Lona circular de sombrilla (Azul playa)
    const canopy = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    canopy.setAttribute("cx", 0);
    canopy.setAttribute("cy", 0);
    canopy.setAttribute("r", rPx * 0.95);
    canopy.setAttribute("fill", "#0284c7");
    canopy.setAttribute("stroke", "#ffffff");
    canopy.setAttribute("stroke-width", "2");
    canopy.setAttribute("opacity", "0.95");
    umbrellaGroup.appendChild(canopy);
    
    // Gajos blancos decorativos
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const radialLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      radialLine.setAttribute("x1", 0);
      radialLine.setAttribute("y1", 0);
      radialLine.setAttribute("x2", Math.sin(angle) * rPx * 0.95);
      radialLine.setAttribute("y2", Math.cos(angle) * rPx * 0.95);
      radialLine.setAttribute("stroke", "#ffffff");
      radialLine.setAttribute("stroke-width", "1.5");
      umbrellaGroup.appendChild(radialLine);
    }
    
    // Tapón/mástil central superior
    const cap = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cap.setAttribute("cx", 0);
    cap.setAttribute("cy", 0);
    cap.setAttribute("r", 4);
    cap.setAttribute("fill", "#ffffff");
    umbrellaGroup.appendChild(cap);
    
    group.appendChild(umbrellaGroup);
  } else {
    const plant = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    plant.setAttribute("cx", 0);
    plant.setAttribute("cy", 0);
    plant.setAttribute("r", isCircle ? rPx * 0.15 : Math.min(elem.w, elem.h) * SCALE * 0.1);
    plant.setAttribute("fill", elem.id === "table-xv" ? "#f472b6" : "#16803d");
    group.appendChild(plant);
  }
  
  // D) Texto Identificador
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("class", "label-element");
  text.setAttribute("y", 0);
  text.setAttribute("font-size", isCircle ? "7px" : "6px");
  text.setAttribute("fill", "#1e293b"); // Letra oscura sobre mantel blanco
  
  // Ajuste de texto para XV
  if (elem.id === "table-xv") {
    text.textContent = "MESA XV";
    text.setAttribute("font-size", "9px");
  } else {
    text.textContent = elem.name;
  }
  group.appendChild(text);
}

// 6. Renderizar Elemento Genérico (Futuros Elementos: Capilla, Baño, Estacionamiento)
function renderGenericElement(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  // Contenedor rectangular principal
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", -wPx/2);
  rect.setAttribute("y", -hPx/2);
  rect.setAttribute("width", wPx);
  rect.setAttribute("height", hPx);
  rect.setAttribute("fill", elem.color || "#4b5563");
  rect.setAttribute("stroke", "rgba(255, 255, 255, 0.4)");
  rect.setAttribute("stroke-width", "2");
  rect.setAttribute("rx", "8");
  rect.setAttribute("filter", "url(#drop-shadow)");
  
  // Estilo específico con línea discontinua para elementos futuros para indicar planificación
  rect.setAttribute("stroke-dasharray", "4,4");
  group.appendChild(rect);
  
  // Dibujar un icono de fondo semitransparente según el tipo
  const iconText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  iconText.setAttribute("font-family", '"Font Awesome 6 Free"');
  iconText.setAttribute("font-weight", "900");
  iconText.setAttribute("font-size", `${Math.min(wPx, hPx) * 0.45}px`);
  iconText.setAttribute("text-anchor", "middle");
  iconText.setAttribute("dominant-baseline", "middle");
  iconText.setAttribute("fill", "rgba(255, 255, 255, 0.15)");
  iconText.setAttribute("y", -5);
  
  // Mapear iconos de FontAwesome
  switch (elem.type) {
    case "parking":
      iconText.textContent = "\uf1b9"; // Car
      break;
    case "chapel":
      iconText.textContent = "\uf67f"; // Church/Place of worship
      break;
    case "bathrooms":
      iconText.textContent = "\uf7c2"; // Restroom
      break;
    case "entrance":
      iconText.textContent = "\uf52b"; // Door open
      break;
    case "exit":
      iconText.textContent = "\uf2f5"; // Sign-out/emergency exit
      break;
    default:
      iconText.textContent = "\uf0ad"; // Wrench
      break;
  }
  group.appendChild(iconText);
  
  // Texto descriptivo superior
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("class", "label-element");
  text.setAttribute("y", hPx/2 - 12);
  text.setAttribute("font-size", "10px");
  text.setAttribute("font-weight", "bold");
  text.setAttribute("fill", "#ffffff");
  text.textContent = elem.name;
  group.appendChild(text);
  
  // Cota de dimensiones (ej: 8m x 5m) para sensación arquitectónica profesional
  const dimText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  dimText.setAttribute("class", "label-element");
  dimText.setAttribute("y", -hPx/2 + 12);
  dimText.setAttribute("font-size", "7px");
  dimText.setAttribute("fill", "rgba(255, 255, 255, 0.7)");
  dimText.textContent = `${elem.w.toFixed(1)}m × ${elem.h.toFixed(1)}m`;
  group.appendChild(dimText);
}
