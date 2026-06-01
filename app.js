/**
 * app.js
 * Controlador principal y gestor de estado (Single Source of Truth) para Salón Jardín La Flor.
 * Conecta el editor 2D, visor 3D, panel de propiedades e importador/exportador.
 */

import { INITIAL_ELEMENTS, FUTURE_ELEMENTS_TEMPLATES, CANVAS_WIDTH, CANVAS_HEIGHT } from "./elements.js?v=2.0";
import { init2D, updateElements2D, selectElement2D, setGridSnap, zoomIn, zoomOut, resetZoom } from "./editor2d.js?v=2.0";
import { init3D, syncWithData, selectElement3D, resetCamera3D, destroy3D } from "./visualizer3d.js?v=2.0";

// Estado global de la aplicación
const state = {
  elements: [],
  selectedElement: null,
  activeView: "2d", // "2d" o "3d"
  useGrid: true
};

document.addEventListener("DOMContentLoaded", () => {
  // 1. Cargar datos iniciales (desde LocalStorage si existen, o original de elements.js)
  const saved = localStorage.getItem("jardin_la_flor_saved_layout");
  if (saved) {
    try {
      state.elements = JSON.parse(saved);
    } catch (e) {
      console.error("Error al cargar distribución guardada, usando predeterminada.", e);
      state.elements = JSON.parse(JSON.stringify(INITIAL_ELEMENTS));
    }
  } else {
    state.elements = JSON.parse(JSON.stringify(INITIAL_ELEMENTS));
  }
  
  // 2. Inicializar interfaces y HUD
  setupUI();
  populateToolbox();
  
  // 3. Inicializar el canvas 2D
  const svgCanvas = document.getElementById("svg-canvas");
  init2D(svgCanvas, state.elements, handleElementSelected, handleElementMoved);
  
  // 4. Registrar listeners de controles de cabecera e inspector
  setupControlListeners();
  setupInspectorListeners();
  
  // Sincronizar recuentos
  updateBadgeCounters();
});

/**
 * Configura la barra de navegación superior y conmutadores de vista
 */
function setupUI() {
  const btn2d = document.getElementById("btn-view-2d");
  const btn3d = document.getElementById("btn-view-3d");
  const container2d = document.getElementById("container-2d");
  const container3d = document.getElementById("container-3d");
  
  btn2d.addEventListener("click", () => {
    if (state.activeView === "2d") return;
    
    state.activeView = "2d";
    btn2d.classList.add("active");
    btn3d.classList.remove("active");
    container2d.classList.add("active");
    container3d.classList.remove("active");
    
    // Detener animación 3D
    destroy3D();
    
    // Volver a renderizar 2D por si hubo cambios
    updateElements2D(state.elements);
    if (state.selectedElement) {
      selectElement2D(state.selectedElement.id);
    }
  });
  
  btn3d.addEventListener("click", () => {
    if (state.activeView === "3d") return;
    
    state.activeView = "3d";
    btn3d.classList.add("active");
    btn2d.classList.remove("active");
    container3d.classList.add("active");
    container2d.classList.remove("active");
    
    // Inicializar e integrar el motor de Three.js
    init3D(container3d, state.elements);
    if (state.selectedElement) {
      selectElement3D(state.selectedElement.id);
    }
  });
  
  // HUD botón restaurar cámara en 3D
  document.getElementById("btn-reset-cam-3d").addEventListener("click", () => {
    if (state.activeView === "3d") {
      resetCamera3D();
    }
  });

  // --- Lógica de Menús Colapsables (Mobile Drawer Overlay) ---
  const btnToggleLeft = document.getElementById("btn-toggle-left");
  const btnToggleRight = document.getElementById("btn-toggle-right");
  const sidebarLeft = document.querySelector(".sidebar-left");
  const sidebarRight = document.querySelector(".sidebar-right");
  const sidebarOverlay = document.getElementById("sidebar-overlay");

  const closeMobileSidebars = () => {
    sidebarLeft.classList.remove("open");
    sidebarRight.classList.remove("open");
    sidebarOverlay.classList.remove("active");
  };

  if (btnToggleLeft && btnToggleRight && sidebarLeft && sidebarRight && sidebarOverlay) {
    btnToggleLeft.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = sidebarLeft.classList.contains("open");
      closeMobileSidebars();
      if (!isOpen) {
        sidebarLeft.classList.add("open");
        sidebarOverlay.classList.add("active");
      }
    });

    btnToggleRight.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = sidebarRight.classList.contains("open");
      closeMobileSidebars();
      if (!isOpen) {
        sidebarRight.classList.add("open");
        sidebarOverlay.classList.add("active");
      }
    });

    sidebarOverlay.addEventListener("click", closeMobileSidebars);
  }

  // --- Lógica para Botones Flotantes (FABs) en móviles ---
  const fabTools = document.getElementById("fab-tools");
  const fabProperties = document.getElementById("fab-properties");

  if (fabTools) {
    fabTools.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = sidebarLeft.classList.contains("open");
      closeMobileSidebars();
      if (!isOpen) {
        sidebarLeft.classList.add("open");
        sidebarOverlay.classList.add("active");
      }
    });
  }

  if (fabProperties) {
    fabProperties.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = sidebarRight.classList.contains("open");
      closeMobileSidebars();
      if (!isOpen) {
        sidebarRight.classList.add("open");
        sidebarOverlay.classList.add("active");
      }
    });
  }
}

/**
 * Carga dinámicamente las herramientas del panel izquierdo
 */
function populateToolbox() {
  const salonContainer = document.getElementById("tools-salon");
  const futureContainer = document.getElementById("tools-future");
  
  salonContainer.innerHTML = "";
  futureContainer.innerHTML = "";
  
  FUTURE_ELEMENTS_TEMPLATES.forEach(tmpl => {
    const btn = document.createElement("div");
    btn.className = "tool-item";
    
    // Mapear icono de FontAwesome
    let iconClass = "fa-solid ";
    switch (tmpl.icon) {
      case "car": iconClass += "fa-car-side"; break;
      case "church": iconClass += "fa-church"; break;
      case "restroom": iconClass += "fa-restroom"; break;
      case "door-open": iconClass += "fa-door-open"; break;
      case "sign-out-alt": iconClass += "fa-door-closed"; break;
      case "square": iconClass += "fa-vector-square"; break;
      case "circle": iconClass += "fa-circle-dot"; break;
      case "bell": iconClass += "fa-bell"; break;
      case "cocktail": iconClass += "fa-martini-glass-citrus"; break;
      case "music": iconClass += "fa-music"; break;
      case "couch": iconClass += "fa-couch"; break;
      case "umbrella": iconClass += "fa-umbrella-beach"; break;
      default: iconClass += "fa-shapes"; break;
    }
    
    btn.innerHTML = `
      <i class="${iconClass}"></i>
      <span>${tmpl.name}</span>
    `;
    
    // Evento para añadir el elemento al plano al hacer clic
    btn.addEventListener("click", () => {
      addNewElement(tmpl);
    });
    
    // Separar en secciones (Mesas vs Elementos Exteriores)
    if (tmpl.type.startsWith("table")) {
      salonContainer.appendChild(btn);
    } else {
      futureContainer.appendChild(btn);
    }
  });
}

/**
 * Añade un nuevo elemento dinámico al plano
 */
function addNewElement(template) {
  const timestamp = Date.now();
  const newId = `${template.type}-${timestamp}`;
  
  // Posicionar el nuevo elemento en el centro geométrico del plano (8m, 10m)
  // con un pequeño desfase aleatorio para no encimarse
  const offset = (Math.random() - 0.5) * 1.5;
  const newX = parseFloat((8.0 + offset).toFixed(1));
  const newY = parseFloat((10.0 + offset).toFixed(1));
  
  const newElement = {
    id: newId,
    type: template.type.startsWith("table") ? "table" : template.type,
    name: template.name.replace(" (10p)", ""),
    x: newX,
    y: newY,
    w: template.w,
    h: template.h || template.w,
    shape: template.shape,
    rotation: 0,
    chairs: template.chairs,
    color: template.color,
    editable: true,
    removable: true
  };
  
  state.elements.push(newElement);
  
  // Actualizar vistas
  syncAllViews();
  
  // Auto-guardar en LocalStorage silenciosamente
  saveLayoutToLocalStorage(true);
  
  // Autoseleccionar el nuevo elemento
  handleElementSelected(newElement);
  if (state.activeView === "2d") {
    selectElement2D(newId);
  } else {
    selectElement3D(newId);
  }
}

/**
 * Sincroniza todas las vistas y HUDs con el estado de datos actual
 */
function syncAllViews() {
  if (state.activeView === "2d") {
    updateElements2D(state.elements);
  } else {
    syncWithData(state.elements);
  }
  updateBadgeCounters();
}

/**
 * Actualiza los recuentos e información en el footer
 */
function updateBadgeCounters() {
  const countBadge = document.getElementById("element-count-badge");
  if (countBadge) {
    countBadge.textContent = `Elementos: ${state.elements.length}`;
  }
}

/**
 * Maneja el evento de selección de un elemento (desde 2D)
 */
function handleElementSelected(element, openSidebar = true) {
  state.selectedElement = element;
  
  const inspectorForm = document.getElementById("inspector-form");
  const noSelectionMsg = document.getElementById("no-selection-msg");
  
  const fabProp = document.getElementById("fab-properties");
  if (element) {
    if (fabProp) fabProp.classList.add("pulse-glow");
  } else {
    if (fabProp) fabProp.classList.remove("pulse-glow");
  }

  if (!element) {
    inspectorForm.style.display = "none";
    noSelectionMsg.style.display = "flex";
    return;
  }
  
  noSelectionMsg.style.display = "none";
  inspectorForm.style.display = "flex";
  
  // Abrir de forma automatizada el panel de propiedades en móviles al seleccionar si está permitido
  if (openSidebar && element && window.innerWidth <= 950) {
    const sidebarLeft = document.querySelector(".sidebar-left");
    const sidebarRight = document.querySelector(".sidebar-right");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    if (sidebarRight && sidebarOverlay) {
      if (sidebarLeft) sidebarLeft.classList.remove("open");
      sidebarRight.classList.add("open");
      sidebarOverlay.classList.add("active");
    }
  }

  // Rellenar valores en el formulario
  document.getElementById("elem-name").value = element.name;
  document.getElementById("elem-x").value = element.x;
  document.getElementById("elem-y").value = element.y;
  document.getElementById("elem-w").value = element.w;
  
  const heightGroup = document.getElementById("group-elem-h");
  const heightInput = document.getElementById("elem-h");
  heightInput.value = element.h || element.w;
  
  // Si es mesa redonda, esconder el largo porque diámetro es w
  if (element.shape === "circle") {
    heightGroup.style.display = "none";
  } else {
    heightGroup.style.display = "flex";
  }
  
  // Rotación
  document.getElementById("elem-rotation").value = element.rotation || 0;
  document.getElementById("rotation-val").textContent = `${element.rotation || 0}°`;
  
  // Color Picker
  document.getElementById("elem-color").value = element.color;
  document.getElementById("elem-color-hex").value = element.color;
  
  // Controles específicos de mesas
  const chairsGroup = document.getElementById("group-elem-chairs");
  const shapeGroup = document.getElementById("group-elem-shape");
  
  if (element.type === "table") {
    chairsGroup.style.display = "flex";
    shapeGroup.style.display = "flex";
    document.getElementById("elem-chairs").value = element.chairs || 10;
    
    // Activar botón de forma
    const btnSquare = document.getElementById("btn-shape-square");
    const btnCircle = document.getElementById("btn-shape-circle");
    if (element.shape === "circle") {
      btnCircle.classList.add("active");
      btnSquare.classList.remove("active");
    } else {
      btnSquare.classList.add("active");
      btnCircle.classList.remove("active");
    }
  } else {
    chairsGroup.style.display = "none";
    shapeGroup.style.display = "none";
  }
  
  // Deshabilitar eliminación para elementos base inamovibles (jardín, barra)
  const deleteBtn = document.getElementById("btn-delete-elem");
  if (element.removable === false) {
    deleteBtn.setAttribute("disabled", "true");
    deleteBtn.style.opacity = "0.4";
    deleteBtn.style.cursor = "not-allowed";
  } else {
    deleteBtn.removeAttribute("disabled");
    deleteBtn.style.opacity = "1";
    deleteBtn.style.cursor = "pointer";
  }
}

/**
 * Maneja el evento de movimiento/arrastre de un elemento en vivo
 */
function handleElementMoved(element) {
  // Sincronizar el formulario del inspector en vivo si es el elemento seleccionado
  if (state.selectedElement && state.selectedElement.id === element.id) {
    document.getElementById("elem-x").value = element.x;
    document.getElementById("elem-y").value = element.y;
  }
  
  // Si estamos en 3D (aunque el arrastre ocurre principalmente en 2D),
  // se sincroniza inmediatamente.
  if (state.activeView === "3d") {
    syncWithData(state.elements);
  }
  
  // Auto-guardar silencioso de la posición tras el arrastre
  saveLayoutToLocalStorage(true);
}

/**
 * Vincula todos los listeners del inspector lateral derecho
 */
function setupInspectorListeners() {
  const updateSelected = (key, val) => {
    if (!state.selectedElement) return;
    state.selectedElement[key] = val;
    syncAllViews();
    saveLayoutToLocalStorage(true); // Auto-guardar al cambiar valores en inspector
  };
  
  // 1. Nombre
  document.getElementById("elem-name").addEventListener("input", (e) => {
    updateSelected("name", e.target.value);
  });
  
  // 2. Coordenadas X e Y
  document.getElementById("elem-x").addEventListener("input", (e) => {
    const val = parseFloat(parseFloat(e.target.value).toFixed(2));
    if (!isNaN(val)) updateSelected("x", val);
  });
  document.getElementById("elem-y").addEventListener("input", (e) => {
    const val = parseFloat(parseFloat(e.target.value).toFixed(2));
    if (!isNaN(val)) updateSelected("y", val);
  });
  
  // 3. Dimensiones Ancho y Alto
  document.getElementById("elem-w").addEventListener("input", (e) => {
    const val = parseFloat(parseFloat(e.target.value).toFixed(2));
    if (!isNaN(val) && val > 0) {
      updateSelected("w", val);
      // Si es circular, h también es w
      if (state.selectedElement.shape === "circle") {
        state.selectedElement.h = val;
      }
    }
  });
  document.getElementById("elem-h").addEventListener("input", (e) => {
    const val = parseFloat(parseFloat(e.target.value).toFixed(2));
    if (!isNaN(val) && val > 0) updateSelected("h", val);
  });
  
  // 4. Rotación (Slider y botones rápidos)
  const rotSlider = document.getElementById("elem-rotation");
  const rotValLabel = document.getElementById("rotation-val");
  
  rotSlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value);
    rotValLabel.textContent = `${val}°`;
    updateSelected("rotation", val);
  });
  
  document.querySelectorAll(".btn-rotate-quick").forEach(btn => {
    btn.addEventListener("click", () => {
      const deg = parseInt(btn.getAttribute("data-deg"));
      rotSlider.value = deg;
      rotValLabel.textContent = `${deg}°`;
      updateSelected("rotation", deg);
    });
  });
  
  // 5. Cantidad de sillas (Solo mesas)
  document.getElementById("elem-chairs").addEventListener("input", (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 2 && val <= 16) {
      updateSelected("chairs", val);
    }
  });
  
  // 6. Forma de la mesa (Cuadrada vs Redonda)
  const btnSquare = document.getElementById("btn-shape-square");
  const btnCircle = document.getElementById("btn-shape-circle");
  
  btnSquare.addEventListener("click", () => {
    if (state.selectedElement && state.selectedElement.shape !== "square") {
      btnSquare.classList.add("active");
      btnCircle.classList.remove("active");
      document.getElementById("group-elem-h").style.display = "flex";
      
      state.selectedElement.shape = "square";
      state.selectedElement.h = state.selectedElement.w; // Resetear largo igual al ancho
      document.getElementById("elem-h").value = state.selectedElement.w;
      
      syncAllViews();
      saveLayoutToLocalStorage(true); // Auto-guardar forma
    }
  });
  
  btnCircle.addEventListener("click", () => {
    if (state.selectedElement && state.selectedElement.shape !== "circle") {
      btnCircle.classList.add("active");
      btnSquare.classList.remove("active");
      document.getElementById("group-elem-h").style.display = "none";
      
      state.selectedElement.shape = "circle";
      state.selectedElement.h = state.selectedElement.w; // En circulo h = w (diámetro)
      
      syncAllViews();
      saveLayoutToLocalStorage(true); // Auto-guardar forma
    }
  });
  
  // 7. Sincronización del color picker dual (Visual y Hexagonal)
  const colorPicker = document.getElementById("elem-color");
  const colorHex = document.getElementById("elem-color-hex");
  
  colorPicker.addEventListener("input", (e) => {
    colorHex.value = e.target.value;
    updateSelected("color", e.target.value);
  });
  
  colorHex.addEventListener("input", (e) => {
    const val = e.target.value;
    if (/^#[0-9A-Ff-f]{6}$/.test(val)) {
      colorPicker.value = val;
      updateSelected("color", val);
    }
  });
  
  // 8. Duplicar Elemento
  document.getElementById("btn-duplicate-elem").addEventListener("click", () => {
    if (!state.selectedElement) return;
    
    const clone = JSON.parse(JSON.stringify(state.selectedElement));
    clone.id = `${clone.type}-${Date.now()}`;
    clone.name = `${clone.name} (Copia)`;
    
    // Desplazar levemente para que se note la copia
    clone.x = Math.min(CANVAS_WIDTH - clone.w/2, clone.x + 0.6);
    clone.y = Math.min(CANVAS_HEIGHT - (clone.h || clone.w)/2, clone.y + 0.6);
    
    state.elements.push(clone);
    syncAllViews();
    saveLayoutToLocalStorage(true); // Auto-guardar duplicación
    
    // Seleccionar la copia
    handleElementSelected(clone);
    if (state.activeView === "2d") {
      selectElement2D(clone.id);
    } else {
      selectElement3D(clone.id);
    }
  });
  
  // 9. Eliminar Elemento
  document.getElementById("btn-delete-elem").addEventListener("click", () => {
    if (!state.selectedElement || state.selectedElement.removable === false) return;
    
    const index = state.elements.findIndex(e => e.id === state.selectedElement.id);
    if (index !== -1) {
      state.elements.splice(index, 1);
      state.selectedElement = null;
      handleElementSelected(null);
      syncAllViews();
      saveLayoutToLocalStorage(true); // Auto-guardar eliminación
    }
  });
}

/**
 * Vincula los listeners de controles principales de la barra superior (Guardar, Cargar, Rejilla, Reset)
 */
function setupControlListeners() {
  // Ajuste magnético de Rejilla
  const btnGrid = document.getElementById("btn-grid");
  const btnGridMob = document.getElementById("btn-grid-mob");
  
  const toggleGrid = () => {
    state.useGrid = !state.useGrid;
    if (state.useGrid) {
      if (btnGrid) btnGrid.classList.add("active");
      if (btnGridMob) btnGridMob.classList.add("active");
    } else {
      if (btnGrid) btnGrid.classList.remove("active");
      if (btnGridMob) btnGridMob.classList.remove("active");
    }
    setGridSnap(state.useGrid);
  };
  
  if (btnGrid) btnGrid.addEventListener("click", toggleGrid);
  if (btnGridMob) btnGridMob.addEventListener("click", toggleGrid);
  
  // Exportar distribución (JSON)
  // Guardar diseño localmente (LocalStorage)
  const saveLocal = () => {
    saveLayoutToLocalStorage(false);
  };
  
  const btnSaveLocal = document.getElementById("btn-save-local");
  if (btnSaveLocal) btnSaveLocal.addEventListener("click", saveLocal);
  const btnSaveLocalMob = document.getElementById("btn-save-local-mob");
  if (btnSaveLocalMob) btnSaveLocalMob.addEventListener("click", saveLocal);

  // Alinear elementos automáticamente
  const alignAll = () => {
    alignElements();
  };

  const btnAlign = document.getElementById("btn-align");
  if (btnAlign) btnAlign.addEventListener("click", alignAll);
  const btnAlignMob = document.getElementById("btn-align-mob");
  if (btnAlignMob) btnAlignMob.addEventListener("click", alignAll);

  const exportDesign = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.elements, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href",     dataStr     );
    dlAnchorElem.setAttribute("download", "plano_jardin_la_flor.json");
    dlAnchorElem.click();
  };
  
  const btnExport = document.getElementById("btn-export");
  if (btnExport) btnExport.addEventListener("click", exportDesign);
  const btnExportMob = document.getElementById("btn-export-mob");
  if (btnExportMob) btnExportMob.addEventListener("click", exportDesign);
  
  // Disparar seleccionador de archivos para importar
  const btnImportTrigger = document.getElementById("btn-import-trigger");
  const btnImportTriggerMob = document.getElementById("btn-import-trigger-mob");
  const fileImport = document.getElementById("file-import");
  
  const triggerImport = () => {
    fileImport.click();
  };
  
  if (btnImportTrigger) btnImportTrigger.addEventListener("click", triggerImport);
  if (btnImportTriggerMob) btnImportTriggerMob.addEventListener("click", triggerImport);
  
  fileImport.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const importedElements = JSON.parse(evt.target.result);
        
        if (Array.isArray(importedElements)) {
          state.elements = importedElements;
          state.selectedElement = null;
          handleElementSelected(null);
          
          // Re-dibujar e integrar según la vista actual
          if (state.activeView === "3d") {
            syncWithData(state.elements);
          } else {
            updateElements2D(state.elements);
          }
          updateBadgeCounters();
          
          // Guardar diseño importado localmente
          saveLayoutToLocalStorage(true);
          
          alert("¡Diseño del plano cargado con éxito!");
        } else {
          alert("Error: El archivo JSON cargado no tiene un formato válido para el plano.");
        }
      } catch (err) {
        alert("Error al leer el archivo JSON: " + err.message);
      }
    };
    reader.readAsText(file);
    // Resetear valor para permitir cargar el mismo archivo varias veces
    fileImport.value = "";
  });
  
  // Reiniciar a la distribución original
  const resetLayout = () => {
    const confirmReset = confirm("¿Está seguro de que desea restablecer el diseño? Se borrarán todos los cambios y elementos adicionales creados.");
    if (confirmReset) {
      localStorage.removeItem("jardin_la_flor_saved_layout");
      state.elements = JSON.parse(JSON.stringify(INITIAL_ELEMENTS));
      state.selectedElement = null;
      handleElementSelected(null);
      syncAllViews();
      showToast('<i class="fa-solid fa-rotate-left" style="color: #f87171;"></i> Plano restablecido a la distribución original.');
    }
  };
  
  const btnReset = document.getElementById("btn-reset");
  if (btnReset) btnReset.addEventListener("click", resetLayout);
  const btnResetMob = document.getElementById("btn-reset-mob");
  if (btnResetMob) btnResetMob.addEventListener("click", resetLayout);

  // Controles de Zoom del HUD en 2D
  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");
  const btnZoomReset = document.getElementById("btn-zoom-reset");
  
  if (btnZoomIn) btnZoomIn.addEventListener("click", zoomIn);
  if (btnZoomOut) btnZoomOut.addEventListener("click", zoomOut);
  if (btnZoomReset) btnZoomReset.addEventListener("click", resetZoom);

  // Compartir plano (Web Share API con fallback a portapapeles)
  const btnShare = document.getElementById("btn-share");
  const btnShareMob = document.getElementById("btn-share-mob");
  
  if (btnShare) btnShare.addEventListener("click", sharePlan);
  if (btnShareMob) btnShareMob.addEventListener("click", sharePlan);

  // Imprimir Plano (PDF)
  const btnPrint = document.getElementById("btn-print");
  const btnPrintMob = document.getElementById("btn-print-mob");

  const triggerPrint = () => {
    // Sincronizar y forzar la actualización del plano 2D antes de imprimir
    // para asegurar que los elementos desplazados queden reflejados en el SVG
    updateElements2D(state.elements);
    
    // Un brevísimo tiempo de espera para que se renderice en el DOM antes de disparar la impresión
    setTimeout(() => {
      window.print();
    }, 50);
  };

  if (btnPrint) btnPrint.addEventListener("click", triggerPrint);
  if (btnPrintMob) btnPrintMob.addEventListener("click", triggerPrint);
}

/**
 * --- SISTEMA NATIVO DE COMPARTIR Y NOTIFICACIÓN TOAST ---
 * Abre el menú de compartir nativo del dispositivo (móvil) o copia el enlace (escritorio/fallback)
 */
let toastTimeout = null;

function sharePlan() {
  const shareData = {
    title: 'Salón Jardín La Flor | Planificador Interactivo 2D y 3D',
    text: '¡Mira la distribución interactiva de mesas y elementos en el Salón Jardín La Flor que acabo de planificar!',
    url: window.location.href
  };

  if (navigator.share) {
    navigator.share(shareData)
      .then(() => {
        showToast('<i class="fa-solid fa-circle-check" style="color: #34d399;"></i> ¡Plano compartido con éxito!');
      })
      .catch((err) => {
        // Si el usuario canceló de manera nativa (AbortError), no hacemos fallback
        if (err.name !== 'AbortError') {
          copyLinkFallback();
        }
      });
  } else {
    copyLinkFallback();
  }
}

function copyLinkFallback() {
  navigator.clipboard.writeText(window.location.href)
    .then(() => {
      showToast('<i class="fa-solid fa-copy" style="color: #60a5fa;"></i> ¡Enlace copiado al portapapeles!');
    })
    .catch(() => {
      showToast('<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i> No se pudo copiar el enlace.');
    });
}

function showToast(messageHtml) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.innerHTML = messageHtml;
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

/**
 * --- FUNCIONES DE ALINEACIÓN Y PERSISTENCIA (LOCALSTORAGE) ---
 */

function saveLayoutToLocalStorage(silent = false) {
  try {
    localStorage.setItem("jardin_la_flor_saved_layout", JSON.stringify(state.elements));
    if (!silent) {
      showToast('<i class="fa-solid fa-circle-check" style="color: #34d399;"></i> ¡Distribución guardada en el navegador!');
    }
  } catch (e) {
    console.error("Error al guardar en LocalStorage:", e);
    if (!silent) {
      showToast('<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i> Error al guardar la distribución.');
    }
  }
}

function alignElements() {
  const threshold = 0.5; // Umbral de proximidad en metros (50cm)
  
  // Elementos móviles o mesas que el usuario puede desplazar/eliminar (evitando base inamovibles)
  const alignableTypes = [
    "table", "table_square", "table_round", "table_umbrella",
    "lounge", "second_bar", "second_dj", "reception",
    "bathrooms", "chapel", "parking"
  ];
  
  const items = state.elements.filter(e => alignableTypes.includes(e.type) && e.removable !== false);
  
  if (items.length <= 1) {
    showToast('<i class="fa-solid fa-circle-info" style="color: #60a5fa;"></i> Se necesitan al menos 2 elementos móviles para alinear.');
    return;
  }
  
  let modified = false;

  // 1. Alineación Horizontal (Y): Agrupamiento por cercanía
  let yGroups = [];
  items.forEach(item => {
    let groupFound = false;
    for (let group of yGroups) {
      if (group.some(member => Math.abs(member.y - item.y) <= threshold)) {
        group.push(item);
        groupFound = true;
        break;
      }
    }
    if (!groupFound) {
      yGroups.push([item]);
    }
  });

  yGroups.forEach(group => {
    if (group.length > 1) {
      let avgY = group.reduce((sum, item) => sum + item.y, 0) / group.length;
      if (state.useGrid) {
        avgY = Math.round(avgY / 0.1) * 0.1; // Snapping a rejilla
      }
      avgY = parseFloat(avgY.toFixed(2));
      
      group.forEach(item => {
        if (item.y !== avgY) {
          item.y = avgY;
          modified = true;
        }
      });
    }
  });

  // 2. Alineación Vertical (X): Agrupamiento por cercanía
  let xGroups = [];
  items.forEach(item => {
    let groupFound = false;
    for (let group of xGroups) {
      if (group.some(member => Math.abs(member.x - item.x) <= threshold)) {
        group.push(item);
        groupFound = true;
        break;
      }
    }
    if (!groupFound) {
      xGroups.push([item]);
    }
  });

  xGroups.forEach(group => {
    if (group.length > 1) {
      let avgX = group.reduce((sum, item) => sum + item.x, 0) / group.length;
      if (state.useGrid) {
        avgX = Math.round(avgX / 0.1) * 0.1; // Snapping a rejilla
      }
      avgX = parseFloat(avgX.toFixed(2));
      
      group.forEach(item => {
        if (item.x !== avgX) {
          item.x = avgX;
          modified = true;
        }
      });
    }
  });

  if (modified) {
    syncAllViews();
    saveLayoutToLocalStorage(true);
    showToast('<i class="fa-solid fa-align-center" style="color: #fbbf24;"></i> ¡Distribución alineada automáticamente!');
  } else {
    showToast('<i class="fa-solid fa-circle-info" style="color: #60a5fa;"></i> Los elementos ya están perfectamente alineados.');
  }
}

