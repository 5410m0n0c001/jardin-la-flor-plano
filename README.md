# Salón Jardín La Flor - Planificador e Interactivo 2D/3D

Este proyecto es una aplicación web interactiva premium de diseño de planos en 2D y 3D, creada específicamente para la planificación espacial del **Salón Jardín La Flor** de 16m × 20m. La aplicación se basa en la distribución original de `jfv3.png`, adaptando las mesas a formato **cuadrado (imperial)** y proporcionando un entorno en blanco flexible para planificar futuras expansiones alrededor (estacionamiento, capilla, baños, accesos, etc.).

La interfaz cuenta con un diseño estético de alta gama (estilo salones de eventos de lujo con acentos dorados y esmeraldas), paneles con efecto de cristal esmerilado (glassmorphism), y un visor tridimensional inmersivo basado en **Three.js**.

---

## 🚀 Cómo Iniciar la Aplicación

Debido a que la aplicación utiliza módulos modernos de JavaScript (`import` / `export`), los navegadores web por seguridad bloquean las llamadas a archivos locales directos (`file://`). Por lo tanto, **es necesario servir la aplicación a través de un servidor web local**.

Tiene varias opciones extremadamente sencillas para ejecutarla en su sistema:

### Opción A: Usando Python (Recomendado - Sin instalar nada extra)
Si tiene Python instalado en su sistema, abra su terminal (PowerShell o CMD) en la carpeta del proyecto y ejecute:

```bash
python -m http.server 8000
```
Luego, abra su navegador web favorito y vaya a:
👉 [http://localhost:8000](http://localhost:8000)

---

### Opción B: Usando Node.js (npx)
Si tiene Node.js instalado, ejecute el siguiente comando en la carpeta del proyecto:

```bash
npx http-server -p 8000
```
O de forma alternativa:
```bash
npx live-server
```
Luego, ingrese a:
👉 [http://localhost:8000](http://localhost:8000)

---

## 🎨 Características Clave

1. **Modelado en Escala Real (1m = 40px):** Todas las posiciones y medidas están mapeadas en metros, lo que garantiza precisión arquitectónica al colocar y alinear las mesas y objetos.
2. **Editor 2D Completo (Plano Croquis):**
   - **Arrastrar y Soltar (Drag-and-Drop):** Mueva libremente las mesas, la cabina de DJ, pista de baile y el jardín lateral.
   - **Ajuste Magnético a Rejilla (Grid Snapping):** Rejilla magnética ajustable cada 10 cm para una alineación simétrica y profesional de los muebles.
   - **Duplicar e Importar/Exportar:** Clone elementos en un clic y guarde el estado del plano en un archivo `.json` local. Puede volver a cargar este archivo en cualquier momento para seguir editando.
3. **Proyección Realista 3D (Three.js):**
   - **Interactividad inmersiva:** Rote (360°), desplace y acerque la cámara con el ratón.
   - **Modelos procedurales:** Visualice manteles fluidos de colores personalizados, vajilla, centros de mesa florales, sillas con respaldo, pista de madera pulida, y una cabina de DJ detallada con altavoces y plantas.
   - **Entorno exterior flexible:** El espacio alrededor del salón techado permanece blanco/gris minimalista, permitiéndole arrastrar elementos exteriores desde la caja de herramientas (capilla con cruz 3D, estacionamiento con marcas viales y un auto 3D, baños, entradas y salidas).
4. **Inspector de Propiedades Dinámico:** Seleccione cualquier objeto en el plano para editar su nombre, coordenadas exactas, dimensiones en metros, rotación precisa en ángulos o color. En las mesas, puede cambiar el número de sillas (2 a 16) y conmutar la forma en vivo entre **cuadrada** y **redonda**.

---

## 📂 Estructura de Archivos del Proyecto

*   `index.html` - Estructura semántica de la página, paneles UI y carga de librerías CDN (Three.js, OrbitControls y FontAwesome).
*   `styles.css` - Sistema de diseño premium, glassmorphism, modo oscuro con acentos dorados y esmeraldas, responsividad.
*   `elements.js` - Base de datos inicial (en metros) de las mesas, la pista de baile, cabina de DJ y jardín, además de plantillas de nuevos elementos.
*   `editor2d.js` - Motor del lienzo 2D basado en SVG interactivo.
*   `visualizer3d.js` - Motor de visualización 3D con iluminación cálida de atardecer, sombras proyectadas y renderizado de mallas.
*   `app.js` - Controlador y orquestador del estado de la aplicación.
