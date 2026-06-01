/**
 * visualizer3d.js
 * Módulo para la visualización en 3D del plano con Three.js.
 * Convierte las coordenadas 2D (x, y) en 3D (x, z) con altura Y.
 * Genera modelos procedurales tridimensionales para mesas, sillas, pista, DJ y elementos exteriores.
 */

let scene, camera, renderer, controls;
let container = null;
let active3dElements = {}; // Diccionario para guardar referencias de mallas { id: MeshGroup }
let currentElementsData = [];
let selectedElementId = null;
let animationFrameId = null;

// Rejilla de selección
let selectionRing = null;

// Colores del material
const COLORS = {
  floorIndoor: 0xefebe9,  // Mármol/cerámica beige
  floorOutdoor: 0xf8fafc, // Exterior blanco/gris limpio (como se solicitó)
  walls: 0x475569,        // Pizarra
  tableCloth: 0xfafafa,   // Blanco puro
  chairSeat: 0x334155,    // Gris oscuro
  chairWood: 0x78350f,    // Madera
  woodDark: 0x3e2723,     // Madera oscura barra
  grass: 0x1e3f20,        // Pasto oscuro
  foliage: 0x15803d,      // Follaje
  gold: 0xd4af37          // Dorado selección/detalles
};

/**
 * Inicializa el motor 3D
 */
export function init3D(containerElement, initialElements) {
  container = containerElement;
  currentElementsData = initialElements;
  
  // Limpiar contenedor por si acaso
  container.innerHTML = "";
  
  // 1. Escena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a); // Fondo oscuro premium
  scene.fog = new THREE.FogExp2(0x0f172a, 0.02); // Niebla suave para profundidad
  
  // 2. Cámara
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(20, 22, 38); // Vista oblicua aérea del terreno completo de 40x40m
  
  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);
  
  // 4. Orbit Controls (Navegación fotorrealista)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 5;
  controls.maxDistance = 60;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // No permitir ver por debajo del suelo
  controls.target.set(20, 0, 20); // Enfocado en el centro del terreno (40m x 40m)
  controls.update();
  
  // 5. Luces
  setupLighting();
  
  // 6. Terreno Base (Plano de 40m x 40m con salón de 16m x 20m al centro)
  createBaseFloor();
  
  // 7. Crear Aro de Selección
  createSelectionRing();
  
  // 8. Renderizar Elementos Iniciales
  syncWithData(initialElements);
  
  // 9. Bucle de Animación
  animate();
  
  // Escuchar redimensionado
  window.addEventListener("resize", resize3D);
}

/**
 * Detiene la animación y limpia memoria (evitar fugas de WebGL)
 */
export function destroy3D() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener("resize", resize3D);
  if (renderer) {
    renderer.dispose();
  }
  scene = null;
  camera = null;
  renderer = null;
  controls = null;
  active3dElements = {};
}

/**
 * Ajusta el visor 3D al tamaño del contenedor
 */
export function resize3D() {
  if (!container || !camera || !renderer) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

/**
 * Restaura la vista de la cámara al encuadre por defecto
 */
export function resetCamera3D() {
  if (!camera || !controls) return;
  // Animación suave de regreso
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos = new THREE.Vector3(20, 22, 38);
  const endTarget = new THREE.Vector3(20, 0, 20);
  
  let t = 0;
  function transition() {
    t += 0.05;
    if (t <= 1) {
      camera.position.lerpVectors(startPos, endPos, t);
      controls.target.lerpVectors(startTarget, endTarget, t);
      controls.update();
      requestAnimationFrame(transition);
    } else {
      camera.position.copy(endPos);
      controls.target.copy(endTarget);
      controls.update();
    }
  }
  transition();
}

/**
 * Configuración de la iluminación realista
 */
function setupLighting() {
  // Luz Ambiental (Soft Fill)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  
  // Luz Solar / Direccional Principal (Tono Atardecer Dorado Cálido)
  const sunLight = new THREE.DirectionalLight(0xffe8d6, 0.8);
  sunLight.position.set(25, 30, -10); // Posición superior oblicua
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 80;
  // Ajustar el frustum de la sombra para cubrir el terreno completo de 40m x 40m
  const d = 25;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);
  
  // Luz de Acento sobre la Pista (Warm SpotLight)
  const spotLight = new THREE.SpotLight(0xa78bfa, 2.5, 15, Math.PI / 4, 0.5, 1);
  spotLight.position.set(21, 8, 23); // Justo arriba de la pista de baile en su nueva posición
  spotLight.target.position.set(21, 0, 23);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  scene.add(spotLight);
  scene.add(spotLight.target);
  
  // Luces de Guirnalda Festivas (Desplazadas +12 en X y +10 en Z)
  const lightColors = [0xfffbeb, 0xfef3c7, 0xffedd5];
  const stringPositions = [
    { x: 17, z: 16 }, { x: 21, z: 16 }, { x: 25, z: 16 },
    { x: 17, z: 20 }, { x: 25, z: 20 }
  ];
  
  stringPositions.forEach((pos, idx) => {
    const festoonLight = new THREE.PointLight(lightColors[idx % 3], 0.25, 6);
    festoonLight.position.set(pos.x, 3.8, pos.z);
    scene.add(festoonLight);
    
    // Pequeño bombillo 3D decorativo
    const bulbGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: lightColors[idx % 3] });
    const bulbMesh = new THREE.Mesh(bulbGeom, bulbMat);
    bulbMesh.position.copy(festoonLight.position);
    scene.add(bulbMesh);
  });
}

/**
 * Crea el suelo base de 40m x 40m con el área techada del salón demarcada
 */
function createBaseFloor() {
  // A) Suelo exterior completo (Blanco/Gris Minimalista, como se pidió)
  const groundGeom = new THREE.BoxGeometry(40, 0.2, 40); // Espacio de 40m x 40m
  const groundMat = new THREE.MeshStandardMaterial({
    color: COLORS.floorOutdoor,
    roughness: 0.85,
    metalness: 0.05
  });
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.position.set(20, -0.1, 20); // Centrado en (20, 20)
  ground.receiveShadow = true;
  scene.add(ground);
  
  // B) Área del salón techada (Raise Floor / Plataforma sutilmente elevada 0.02m)
  // De 16m de ancho y 20m de largo, centrada en (20, 20)
  const salonFloorGeom = new THREE.BoxGeometry(16, 0.02, 20);
  const salonFloorMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Azulejo gris/beige satinado
    roughness: 0.45,
    metalness: 0.1
  });
  const salonFloor = new THREE.Mesh(salonFloorGeom, salonFloorMat);
  salonFloor.position.set(20, 0.01, 20); // Centrado en (20, 20)
  salonFloor.receiveShadow = true;
  scene.add(salonFloor);
  
  // Añadir cuadrícula del terreno completo (40m x 40m)
  const gridHelper = new THREE.GridHelper(40, 40, 0x94a3b8, 0xcbd5e1);
  gridHelper.position.set(20, 0.021, 20);
  gridHelper.material.opacity = 0.15;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);
  
  // Columnas/Paredes perimetrales del área techada (SALON_X=12 a 28, SALON_Y=10 a 30)
  const colGeom = new THREE.BoxGeometry(0.4, 4.0, 0.4);
  const colMat = new THREE.MeshStandardMaterial({ color: COLORS.walls, roughness: 0.7 });
  
  const colPositions = [
    { x: 12.2, z: 10.2 },
    { x: 27.8, z: 10.2 },
    { x: 12.2, z: 29.8 },
    { x: 27.8, z: 29.8 },
    { x: 12.2, z: 20.0 },
    { x: 27.8, z: 20.0 }
  ];
  
  colPositions.forEach(pos => {
    const col = new THREE.Mesh(colGeom, colMat);
    col.position.set(pos.x, 2.0, pos.z); // Altura centrada a 2m (4m de alto)
    col.castShadow = true;
    col.receiveShadow = true;
    scene.add(col);
  });
}

/**
 * Crea el aro de selección flotante que rodea el elemento activo
 */
function createSelectionRing() {
  const ringGeom = new THREE.RingGeometry(0.8, 0.9, 32);
  ringGeom.rotateX(-Math.PI / 2); // Acostado
  const ringMat = new THREE.MeshBasicMaterial({
    color: COLORS.gold,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  selectionRing = new THREE.Mesh(ringGeom, ringMat);
  selectionRing.position.set(0, -100, 0); // Ocultar por defecto
  scene.add(selectionRing);
}

/**
 * Sincroniza la escena 3D con la base de datos de elementos 2D
 */
export function syncWithData(elementsArray) {
  currentElementsData = elementsArray;
  
  // 1. Identificar y eliminar elementos 3D que ya no existen en los datos
  const dataIds = elementsArray.map(e => e.id);
  Object.keys(active3dElements).forEach(id => {
    if (!dataIds.includes(id)) {
      scene.remove(active3dElements[id]);
      delete active3dElements[id];
    }
  });
  
  // 2. Crear o actualizar elementos existentes
  elementsArray.forEach(elem => {
    let group = active3dElements[elem.id];
    
    if (!group) {
      // Crear grupo nuevo de mallas 3D
      group = new THREE.Group();
      group.name = elem.name;
      group.userData = { id: elem.id, type: elem.type };
      
      // Construir la geometría 3D detallada según el tipo
      build3DElement(group, elem);
      
      scene.add(group);
      active3dElements[elem.id] = group;
    } else {
      // Si el tipo, forma o tamaño cambió, reconstruir la geometría
      if (group.userData.shape !== elem.shape || 
          group.userData.chairs !== elem.chairs || 
          group.userData.color !== elem.color ||
          group.userData.w !== elem.w ||
          group.userData.h !== elem.h) {
        // Limpiar mallas antiguas
        while(group.children.length > 0){
          group.remove(group.children[0]);
        }
        build3DElement(group, elem);
      }
    }
    
    // Actualizar coordenadas y rotación
    // El SVG mapea X -> X y Y -> Z en el espacio 3D
    group.position.set(elem.x, 0, elem.y);
    group.rotation.y = - (elem.rotation || 0) * Math.PI / 180; // Invertido debido a sistemas de coordenadas
  });
  
  // 3. Actualizar aro de selección
  updateSelectionRing();
}

/**
 * Establece el elemento seleccionado en 3D
 */
export function selectElement3D(elementId) {
  selectedElementId = elementId;
  updateSelectionRing();
}

/**
 * Actualiza la posición del aro de selección
 */
function updateSelectionRing() {
  if (!selectionRing) return;
  
  if (!selectedElementId || !active3dElements[selectedElementId]) {
    selectionRing.position.y = -100; // Esconder
    return;
  }
  
  const group = active3dElements[selectedElementId];
  const data = currentElementsData.find(e => e.id === selectedElementId);
  
  if (!data) return;
  
  // Posicionar sutilmente arriba del suelo
  selectionRing.position.set(group.position.x, 0.05, group.position.z);
  
  // Ajustar el tamaño del aro según el tamaño del objeto
  const size = Math.max(data.w, data.h || data.w) * 0.85;
  selectionRing.scale.set(size, size, size);
}

/**
 * Bucle de renderizado
 */
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  
  if (controls) controls.update();
  
  // Pequeño efecto de latido y giro en el aro de selección
  if (selectionRing && selectedElementId) {
    const time = Date.now() * 0.003;
    selectionRing.rotation.y = time * 0.2;
    const pulse = 1.0 + Math.sin(time * 2) * 0.04;
    selectionRing.scale.multiplyScalar(pulse);
  }
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

/* ==========================================
   MÉTODOS DE CONSTRUCCIÓN GEOMÉTRICA 3D
   ========================================== */

function build3DElement(group, elem) {
  group.userData.shape = elem.shape;
  group.userData.chairs = elem.chairs;
  group.userData.color = elem.color;
  group.userData.w = elem.w;
  group.userData.h = elem.h;
  
  switch (elem.type) {
    case "garden":
      build3DGarden(group, elem);
      break;
    case "bar":
      build3DBar(group, elem);
      break;
    case "dancefloor":
      build3DDancefloor(group, elem);
      break;
    case "dj":
      build3DDJ(group, elem);
      break;
    case "table":
      build3DTable(group, elem);
      break;
    default:
      build3DGeneric(group, elem);
      break;
  }
}

// 1. Construir Jardín
function build3DGarden(group, elem) {
  // Césped base
  const baseGeom = new THREE.BoxGeometry(elem.w, 0.04, elem.h);
  const baseMat = new THREE.MeshStandardMaterial({
    color: COLORS.grass,
    roughness: 0.9,
    metalness: 0.0
  });
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.position.y = 0.02;
  base.receiveShadow = true;
  group.add(base);
  
  // Agregar arbustos y plantas en el perímetro de forma procedural
  const bushGeom = new THREE.SphereGeometry(0.35, 8, 8);
  const bushMat = new THREE.MeshStandardMaterial({
    color: COLORS.foliage,
    roughness: 0.95
  });
  
  // Distribuir arbustos a lo largo del eje Z del jardín
  const step = 0.8;
  for (let z = -elem.h/2 + 0.4; z < elem.h/2; z += step) {
    // Lado izquierdo
    const bushL = new THREE.Mesh(bushGeom, bushMat);
    const randScaleL = 0.7 + Math.random() * 0.5;
    bushL.scale.set(randScaleL, randScaleL + 0.2, randScaleL);
    bushL.position.set(-elem.w/2 + 0.3, 0.2, z);
    bushL.castShadow = true;
    group.add(bushL);
    
    // Lado derecho
    const bushR = new THREE.Mesh(bushGeom, bushMat);
    const randScaleR = 0.7 + Math.random() * 0.5;
    bushR.scale.set(randScaleR, randScaleR + 0.2, randScaleR);
    bushR.position.set(elem.w/2 - 0.3, 0.2, z);
    bushR.castShadow = true;
    group.add(bushR);
  }
}

// 2. Construir Barra / Cocina
function build3DBar(group, elem) {
  // Estructura de madera inferior
  const woodGeom = new THREE.BoxGeometry(elem.w, 1.0, elem.h);
  const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.woodDark, roughness: 0.6 });
  const woodBase = new THREE.Mesh(woodGeom, woodMat);
  woodBase.position.y = 0.5;
  woodBase.castShadow = true;
  woodBase.receiveShadow = true;
  group.add(woodBase);
  
  // Encimera superior de mármol blanco/granito
  const topGeom = new THREE.BoxGeometry(elem.w + 0.1, 0.08, elem.h + 0.1);
  const topMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.1 });
  const top = new THREE.Mesh(topGeom, topMat);
  top.position.y = 1.04;
  top.castShadow = true;
  group.add(top);
  
  // Fregadero cromado metálico
  const sinkG = new THREE.Group();
  sinkG.position.set(-elem.w / 3, 1.085, 0);
  
  const outerGeom = new THREE.BoxGeometry(0.8, 0.01, 0.5);
  const outerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
  const outer = new THREE.Mesh(outerGeom, outerMat);
  sinkG.add(outer);
  
  const tapGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8);
  const tapMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.1 });
  const tap = new THREE.Mesh(tapGeom, tapMat);
  tap.position.set(0, 0.12, -0.15);
  tap.rotation.x = Math.PI / 6;
  sinkG.add(tap);
  
  group.add(sinkG);
}

// 3. Construir Pista de Baile
function build3DDancefloor(group, elem) {
  // Tarima de madera
  const geom = new THREE.BoxGeometry(elem.w, 0.08, elem.h);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x92400e, // Ocre oscuro
    roughness: 0.3,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = 0.04;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  
  // Borde perimetral metálico dorado
  const borderGeom = new THREE.BoxGeometry(elem.w + 0.1, 0.09, elem.h + 0.1);
  const borderMat = new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.8, roughness: 0.2 });
  const border = new THREE.Mesh(borderGeom, borderMat);
  border.position.y = 0.045;
  group.add(border);
}

// 4. Construir Cabina de DJ
function build3DDJ(group, elem) {
  // Escenario base
  const stageGeom = new THREE.BoxGeometry(elem.w, 0.3, elem.h);
  const stageMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const stage = new THREE.Mesh(stageGeom, stageMat);
  stage.position.y = 0.15;
  stage.receiveShadow = true;
  stage.castShadow = true;
  group.add(stage);
  
  // Consola / Cabina de mezclas
  const consoleGeom = new THREE.BoxGeometry(elem.w * 0.5, 0.8, elem.h * 0.6);
  const consoleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
  const djConsole = new THREE.Mesh(consoleGeom, consoleMat);
  djConsole.position.set(0, 0.7, 0);
  djConsole.castShadow = true;
  group.add(djConsole);
  
  // Mezclador 3D (Detalles de colores encima de la consola)
  const mixerGeom = new THREE.BoxGeometry(elem.w * 0.4, 0.04, elem.h * 0.4);
  const mixerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const mixer = new THREE.Mesh(mixerGeom, mixerMat);
  mixer.position.set(0, 1.12, 0);
  group.add(mixer);
  
  // Altavoces en las esquinas
  const spkGeom = new THREE.BoxGeometry(0.4, 1.2, 0.4);
  const spkMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 });
  
  // Altavoz Izquierdo
  const spkL = new THREE.Mesh(spkGeom, spkMat);
  spkL.position.set(-elem.w/2 + 0.4, 0.9, 0);
  spkL.castShadow = true;
  group.add(spkL);
  
  // Altavoz Derecho
  const spkR = new THREE.Mesh(spkGeom, spkMat);
  spkR.position.set(elem.w/2 - 0.4, 0.9, 0);
  spkR.castShadow = true;
  group.add(spkR);
  
  // Macetas con plantas (decoración alrededor)
  const potGeom = new THREE.CylinderGeometry(0.2, 0.15, 0.35, 12);
  const potMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  
  const plantL = new THREE.Group();
  plantL.position.set(-elem.w/2 + 0.9, 0.3, 0);
  const potL = new THREE.Mesh(potGeom, potMat);
  potL.position.y = 0.175;
  plantL.add(potL);
  const foliageL = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({color: COLORS.foliage}));
  foliageL.position.y = 0.4;
  plantL.add(foliageL);
  group.add(plantL);
  
  const plantR = new THREE.Group();
  plantR.position.set(elem.w/2 - 0.9, 0.3, 0);
  const potR = new THREE.Mesh(potGeom, potMat);
  potR.position.y = 0.175;
  plantR.add(potR);
  const foliageR = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({color: COLORS.foliage}));
  foliageR.position.y = 0.4;
  plantR.add(foliageR);
  group.add(plantR);
}

// 5. Construir Mesas y Sillas
function build3DTable(group, elem) {
  const isCircle = elem.shape === "circle";
  const numChairs = elem.chairs || 10;
  const radius = elem.w / 2;
  const tableHeight = 0.75;
  const hexColor = parseInt(elem.color.replace("#", "0x"));
  
  // A) Tablero de la mesa (Con mantel cayendo)
  let tableMesh;
  const clothMat = new THREE.MeshStandardMaterial({
    color: hexColor,
    roughness: 0.65,
    bumpScale: 0.05
  });
  
  if (isCircle) {
    // Mesa redonda
    const geom = new THREE.CylinderGeometry(radius, radius, 0.05, 32);
    tableMesh = new THREE.Mesh(geom, clothMat);
    tableMesh.position.y = tableHeight - 0.025;
    
    // Falda del mantel colgando
    const drapeGeom = new THREE.CylinderGeometry(radius, radius + 0.05, 0.3, 32, 1, true);
    const drape = new THREE.Mesh(drapeGeom, clothMat);
    drape.position.y = tableHeight - 0.15;
    group.add(drape);
  } else {
    // Mesa cuadrada / rectangular
    const geom = new THREE.BoxGeometry(elem.w, 0.05, elem.h);
    tableMesh = new THREE.Mesh(geom, clothMat);
    tableMesh.position.y = tableHeight - 0.025;
    
    // Falda del mantel
    const drapeGeom = new THREE.BoxGeometry(elem.w, 0.3, elem.h);
    const drape = new THREE.Mesh(drapeGeom, clothMat);
    drape.position.y = tableHeight - 0.15;
    group.add(drape);
  }
  
  tableMesh.castShadow = true;
  tableMesh.receiveShadow = true;
  group.add(tableMesh);
  
  // Patas de la mesa (simples en el centro)
  const legGeom = new THREE.CylinderGeometry(0.06, 0.06, tableHeight - 0.05, 8);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.2 });
  const leg = new THREE.Mesh(legGeom, legMat);
  leg.position.y = (tableHeight - 0.05) / 2;
  group.add(leg);
  
  // B) Centro de mesa floral
  const vaseGeom = new THREE.CylinderGeometry(0.06, 0.08, 0.15, 8);
  const vaseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1 });
  const vase = new THREE.Mesh(vaseGeom, vaseMat);
  vase.position.y = tableHeight + 0.075;
  group.add(vase);
  
  const floralGeom = new THREE.SphereGeometry(0.12, 8, 8);
  const floralMat = new THREE.MeshStandardMaterial({
    color: elem.id === "table-xv" ? 0xf472b6 : 0x16a34a,
    roughness: 0.9
  });
  const flowers = new THREE.Mesh(floralGeom, floralMat);
  flowers.position.y = tableHeight + 0.18;
  group.add(flowers);

  // D) Si es mesa con sombrilla, añadir mástil y lona de sombrilla en 3D
  if (elem.name.toLowerCase().includes("sombrilla")) {
    const umbrellaGroup = new THREE.Group();
    
    // Mástil de la sombrilla (tubo de metal blanco cromado)
    const poleGeom = new THREE.CylinderGeometry(0.02, 0.02, 2.2, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.1 });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.y = 1.1; // Altura del mástil de 2.2m
    umbrellaGroup.add(pole);
    
    // Lona de la sombrilla (cono azul)
    const canopyGeom = new THREE.ConeGeometry(radius * 0.95, 0.4, 16);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Azul piscina/playa
      roughness: 0.7,
      side: THREE.DoubleSide
    });
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.position.y = 2.0; // A 2.0m de altura
    umbrellaGroup.add(canopy);
    
    // Varillas / Aro de varilla blanco
    const ringGeom = new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 0.02, 16, 1, true);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = 1.8;
    umbrellaGroup.add(ring);
    
    group.add(umbrellaGroup);
    
    // Ajustar el jarrón y florero para acomodar el mástil
    flowers.scale.set(0.6, 0.6, 0.6);
    flowers.position.y = tableHeight + 0.12;
  }
  
  // C) Sillas alrededor de la mesa
  const chairOffset = radius + 0.2; // Separación respecto al centro
  const chairGroup = new THREE.Group();
  
  const chairList = [];
  if (isCircle) {
    // Distribuir sillas de forma circular
    for (let i = 0; i < numChairs; i++) {
      const angle = (i * 2 * Math.PI) / numChairs;
      chairList.push({
        x: Math.sin(angle) * chairOffset,
        z: Math.cos(angle) * chairOffset,
        rot: angle + Math.PI // Mirando hacia la mesa
      });
    }
  } else {
    // Distribución rectangular
    if (elem.shape === "square" && numChairs === 10) {
      const offset = 0.25;
      const w = elem.w;
      const h = elem.h;
      
      // Arriba
      chairList.push({ x: -w/3, z: -h/2 - offset, rot: 0 });
      chairList.push({ x: 0, z: -h/2 - offset, rot: 0 });
      chairList.push({ x: w/3, z: -h/2 - offset, rot: 0 });
      
      // Abajo
      chairList.push({ x: -w/3, z: h/2 + offset, rot: Math.PI });
      chairList.push({ x: 0, z: h/2 + offset, rot: Math.PI });
      chairList.push({ x: w/3, z: h/2 + offset, rot: Math.PI });
      
      // Izquierda
      chairList.push({ x: -w/2 - offset, z: -h/4, rot: -Math.PI/2 });
      chairList.push({ x: -w/2 - offset, z: h/4, rot: -Math.PI/2 });
      
      // Derecha
      chairList.push({ x: w/2 + offset, z: -h/4, rot: Math.PI/2 });
      chairList.push({ x: w/2 + offset, z: h/4, rot: Math.PI/2 });
    } else if (elem.id === "table-xv") {
      // Sillas en el frente y cabeceras
      const w = elem.w;
      const h = elem.h;
      const offset = 0.22;
      
      for (let i = 0; i < 4; i++) {
        chairList.push({ x: -w/2 - offset, z: -h/3 + (h/3)*i, rot: -Math.PI/2 });
        chairList.push({ x: w/2 + offset, z: -h/3 + (h/3)*i, rot: Math.PI/2 });
      }
      chairList.push({ x: 0, z: -h/2 - offset, rot: 0 });
      chairList.push({ x: 0, z: h/2 + offset, rot: Math.PI });
    } else {
      // Genérica circular
      for (let i = 0; i < numChairs; i++) {
        const angle = (i * 2 * Math.PI) / numChairs;
        chairList.push({
          x: Math.sin(angle) * (elem.w/2 + 0.22),
          z: Math.cos(angle) * (elem.h/2 + 0.22),
          rot: angle + Math.PI
        });
      }
    }
  }
  
  // Construir las sillas físicamente en 3D
  chairList.forEach(pos => {
    const singleChair = create3DChair();
    singleChair.position.set(pos.x, 0, pos.z);
    singleChair.rotation.y = pos.rot;
    chairGroup.add(singleChair);
  });
  
  group.add(chairGroup);
}

/**
 * Crea una silla 3D detallada y estilizada con asiento de tela y patas de madera
 */
function create3DChair() {
  const group = new THREE.Group();
  const seatHeight = 0.42;
  
  // Asiento acolchado
  const seatGeom = new THREE.BoxGeometry(0.35, 0.05, 0.35);
  const seatMat = new THREE.MeshStandardMaterial({ color: COLORS.chairSeat, roughness: 0.7 });
  const seat = new THREE.Mesh(seatGeom, seatMat);
  seat.position.y = seatHeight;
  seat.castShadow = true;
  seat.receiveShadow = true;
  group.add(seat);
  
  // Respaldo
  const backGeom = new THREE.BoxGeometry(0.35, 0.4, 0.04);
  const back = new THREE.Mesh(backGeom, seatMat);
  back.position.set(0, seatHeight + 0.2, -0.155);
  back.castShadow = true;
  group.add(back);
  
  // Patas de madera (4 cilindros delgados)
  const legGeom = new THREE.CylinderGeometry(0.015, 0.015, seatHeight, 4);
  const legMat = new THREE.MeshStandardMaterial({ color: COLORS.chairWood, roughness: 0.6 });
  
  const legPositions = [
    { x: -0.15, z: -0.15 },
    { x: 0.15, z: -0.15 },
    { x: -0.15, z: 0.15 },
    { x: 0.15, z: 0.15 }
  ];
  
  legPositions.forEach(pos => {
    const leg = new THREE.Mesh(legGeom, legMat);
    leg.position.set(pos.x, seatHeight / 2, pos.z);
    leg.castShadow = true;
    group.add(leg);
  });
  
  return group;
}

// 6. Construir Elemento Genérico Planificado (Capilla, Estacionamiento, Baños)
function build3DGeneric(group, elem) {
  const w = elem.w;
  const h = elem.h;
  const hexColor = parseInt(elem.color.replace("#", "0x"));
  
  // A) Renderizado arquitectónico translúcido para elementos futuros
  const boxGeom = new THREE.BoxGeometry(w, 2.5, h); // Altura genérica de 2.5m
  const boxMat = new THREE.MeshStandardMaterial({
    color: hexColor,
    transparent: true,
    opacity: 0.5,
    roughness: 0.5,
    metalness: 0.1
  });
  
  const mainBlock = new THREE.Mesh(boxGeom, boxMat);
  mainBlock.position.y = 1.25; // Centrado verticalmente
  mainBlock.castShadow = true;
  mainBlock.receiveShadow = true;
  group.add(mainBlock);
  
  // B) Detalles temáticos interiores y adornos para los mockups
  if (elem.type === "parking") {
    // Piso de asfalto gris con líneas blancas de aparcamiento
    scene.remove(mainBlock); // No queremos un bloque 3D para el estacionamiento, solo el plano en el suelo
    
    const floorGeom = new THREE.BoxGeometry(w, 0.01, h);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = 0.005;
    floor.receiveShadow = true;
    group.add(floor);
    
    // Dibujar un carrito tridimensional minimalista hecho de bloques 3D sobre el estacionamiento
    const carGroup = new THREE.Group();
    carGroup.position.set(0, 0.01, 0);
    
    const bodyGeom = new THREE.BoxGeometry(1.6, 0.4, 0.9);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }); // Carrito rojo
    const carBody = new THREE.Mesh(bodyGeom, bodyMat);
    carBody.position.y = 0.25;
    carBody.castShadow = true;
    carGroup.add(carBody);
    
    const cabinGeom = new THREE.BoxGeometry(0.9, 0.3, 0.8);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 }); // Parabrisas
    const cabin = new THREE.Mesh(cabinGeom, cabinMat);
    cabin.position.set(-0.1, 0.5, 0);
    cabin.castShadow = true;
    carGroup.add(cabin);
    
    // Llantitas
    const wheelGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8);
    wheelGeom.rotateX(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    
    const wheelPositions = [
      { x: -0.5, z: -0.45 },
      { x: 0.5, z: -0.45 },
      { x: -0.5, z: 0.45 },
      { x: 0.5, z: 0.45 }
    ];
    
    wheelPositions.forEach(wp => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.position.set(wp.x, 0.12, wp.z);
      carGroup.add(wheel);
    });
    
    group.add(carGroup);
  } 
  else if (elem.type === "chapel") {
    // Dar forma de iglesia/capilla (Techo a dos aguas y una Cruz tridimensional)
    scene.remove(mainBlock);
    
    // Edificio base
    const bHeight = 3.5;
    const buildGeom = new THREE.BoxGeometry(w, bHeight, h * 0.8);
    const build = new THREE.Mesh(buildGeom, boxMat);
    build.position.y = bHeight / 2;
    build.castShadow = true;
    group.add(build);
    
    // Techo triangular
    const roofGeom = new THREE.ConeGeometry(w * 0.7, 1.8, 4);
    roofGeom.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.set(0, bHeight + 0.9, 0);
    roof.castShadow = true;
    group.add(roof);
    
    // Cruz 3D
    const crossGroup = new THREE.Group();
    crossGroup.position.set(0, bHeight + 1.8, h * 0.35);
    
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), new THREE.MeshBasicMaterial({ color: COLORS.gold }));
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: COLORS.gold }));
    crossH.position.y = 0.18;
    crossGroup.add(crossV);
    crossGroup.add(crossH);
    group.add(crossGroup);
  }
}
