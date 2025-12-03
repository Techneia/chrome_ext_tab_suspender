# Chrome Tab Suspender

Una extensión de Google Chrome ligera y moderna para gestionar y suspender pestañas automáticamente, ahorrando memoria y mejorando el rendimiento de tu navegador.

![Imagen descriptiva de la extensión ya instalada](/assets/screenshot.png)

## Características

*   **Suspensión Automática**: Configura un temporizador para suspender pestañas inactivas automáticamente.
*   **Límite de Pestañas**: Mantén un número máximo de pestañas activas; las más antiguas se suspenden automáticamente.
*   **Gestión Manual**: Suspende pestañas individualmente o selecciona múltiples pestañas para suspenderlas en grupo.
*   **Modo Selección**: Interfaz intuitiva con casillas de verificación estilo moderno para acciones en lote.
*   **Exclusiones Inteligentes**: Evita suspender pestañas que reproducen audio/video o dominios específicos (lista blanca).
*   **Búsqueda y Filtrado**: Encuentra rápidamente tus pestañas por título o URL.
*   **Tema Claro/Oscuro**: Interfaz adaptable a tus preferencias visuales.
*   **Soporte Incógnito**: Funciona perfectamente en ventanas de incógnito, mostrando solo las pestañas relevantes.

## Requisitos

*   Google Chrome (versión 88 o superior).
*   Permisos necesarios (solicitados al instalar):
    *   `tabs`: Para acceder y gestionar las pestañas.
    *   `storage`: Para guardar tus preferencias y configuraciones.
    *   `alarms`: Para las comprobaciones automáticas en segundo plano.

## Instalación (Modo Desarrollador)

Como esta extensión aún no está en la Chrome Web Store, puedes instalarla manualmente siguiendo estos pasos:

1.  **Descargar el código**:
    *   Clona este repositorio o descarga el archivo ZIP y descomprímelo en una carpeta de tu elección.

2.  **Abrir Chrome**:
    *   Navega a `chrome://extensions/` en tu barra de direcciones.

3.  **Activar Modo Desarrollador**:
    *   En la esquina superior derecha, activa el interruptor **"Modo de desarrollador"**.

4.  **Cargar la extensión**:
    *   Haz clic en el botón **"Cargar descomprimida"** que aparece arriba a la izquierda.
    *   Selecciona la carpeta donde descargaste/descomprimiste los archivos de la extensión (la carpeta que contiene el archivo `manifest.json`).

5.  **¡Listo!**:
    *   La extensión "Tab Suspender" debería aparecer ahora en tu lista de extensiones y en la barra de herramientas de Chrome.

## Uso

1.  Haz clic en el icono de la extensión en la barra de herramientas.
2.  Usa el **icono de engranaje** para configurar las reglas de suspensión automática.
3.  Usa el **icono de selección** (cuadrado con check) para activar el modo de selección múltiple.
4.  Usa el **icono de sol/luna** para cambiar entre tema claro y oscuro.

## Informe de Seguridad

Se ha realizado una revisión de seguridad del código para identificar vulnerabilidades.

### Hallazgos

*   **XSS (Cross-Site Scripting)**: El código es seguro. Se utiliza `textContent` para mostrar contenido generado por el usuario (títulos de pestañas y URLs), lo que previene la inyección de scripts.
*   **Permisos**: Los permisos solicitados en `manifest.json` (`tabs`, `storage`, `alarms`) son estrictamente necesarios para las funcionalidades ofrecidas y no son excesivamente amplios.
*   **Política de Seguridad de Contenidos (CSP)**: Manifest V3 impone una CSP estricta por defecto, lo que previene scripts en línea y el uso de `eval()`, añadiendo una capa robusta de seguridad.

### Correcciones Aplicadas

*   Se identificó una instancia menor donde un mensaje de error se insertaba usando `innerHTML`. Aunque el riesgo era bajo, se reemplazó con `textContent` para asegurar que, incluso si un mensaje de error contuviera HTML malicioso, se renderizaría como texto plano.

La extensión es segura y está lista para su uso.

## Licencia

Este proyecto está bajo la Licencia Apache 2.0. Consulta el archivo `LICENSE` para más detalles.
# chrome_ext_tab_suspender
