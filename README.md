# LobbyPack

LobbyPack es una aplicacion web para la gestion de recepcion y retiro de paquetes en edificios, condominios, cabinas de recepcion o conserjerias. Su objetivo es ayudar al personal de recepcion a registrar paquetes, consultar entregas, marcar retiros y dar seguimiento a reclamos desde una sola interfaz.

## Descripcion del proyecto

Este proyecto simula el funcionamiento de un punto de recepcion de paquetes dentro de una comunidad residencial. Puede adaptarse a distintos nombres segun el contexto, por ejemplo:

- Conserjeria
- Recepcion
- Cabina de control
- Punto de entrega y retiro

La aplicacion centraliza informacion importante como:

- Departamento o unidad asociada al paquete
- Nombre del residente
- Empresa de despacho
- Conserje o persona que recepciona
- Estado del paquete
- Historial de retiros
- Reclamos relacionados

## Funcionalidades principales

- Registro manual de nuevos paquetes mediante un formulario.
- Visualizacion de paquetes recepcionados.
- Visualizacion de paquetes retirados.
- Generacion y uso de codigo QR para simular el retiro de un paquete.
- Busqueda de paquetes por codigo, nombre, departamento, empresa u otros datos.
- Edicion de paquetes existentes.
- Eliminacion individual o masiva de registros.
- Paginacion de resultados para manejar grandes volúmenes de paquetes.
- Vista de reclamos con estado y seguimiento.
- Panel de configuracion para editar datos generales del edificio o recepcion.
- Administracion de torres, pisos y departamentos desde la seccion de configuracion.

## Flujo general de uso

1. El personal de recepcion registra un paquete cuando llega al edificio.
2. El paquete queda listado en la vista de paquetes recepcionados.
3. Cuando el residente retira el paquete, se puede validar o simular el retiro usando QR.
4. El paquete pasa a la vista de paquetes retirados.
5. Si existe algun inconveniente, se puede consultar la seccion de reclamos.

## Tecnologias utilizadas

- React
- TypeScript
- Vite
- CSS
- `react-qr-code`

## Estructura general

- `frontend/src/pages/Home`: pantalla principal de recepcion, retiro y reclamos.
- `frontend/src/pages/Settings`: pantalla de configuracion general del sistema.
- `frontend/src/components/Home`: componentes para listado, formulario, modal y QR de paquetes.
- `frontend/src/components/Settings`: componentes para editar torres, pisos y departamentos.
- `frontend/src/data`: datos mock utilizados para poblar la interfaz.
- `frontend/src/utils`: funciones auxiliares para paquetes y configuracion de torres.
- `backend`: API y logica del servidor.
- `database`: scripts de inicializacion de base de datos.

## Instalacion y ejecucion

### Requisitos

- Bun o npm
- Node.js instalado

### Ejecutar en desarrollo

Con Bun:

```bash
cd frontend
bun install
bun run dev
```

Con npm:

```bash
cd frontend
npm install
npm run dev
```

### Generar build de produccion

```bash
cd frontend
bun run build
```

### Previsualizar build

```bash
cd frontend
bun run preview
```

## Despliegue en Railway

Este repositorio es un monorepo. Railway no debe usar la raiz del repositorio como
directorio raiz del servicio, porque los archivos de cada aplicacion estan dentro
de carpetas separadas.

Configura dos servicios:

- Backend: root directory `backend`.
- Frontend: root directory `frontend`.

Variables importantes para el backend en Railway:

- `PORT`: Railway la define automaticamente.
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DB`: datos de la base de datos MySQL.
- `CORS_ORIGIN`: URL publica del frontend.

Variables importantes para el frontend en Railway:

- `VITE_API_BASE_URL`: URL publica del backend.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `VITE_GEOAPIFY_API_KEY`: variables usadas por Vite.

## Estado actual

Actualmente el proyecto funciona como una demo funcional con datos mock. Esto significa que la informacion se maneja en memoria y no esta conectada todavia a una base de datos ni a un backend real.

## Posibles mejoras futuras

- Integracion con base de datos.
- Login para personal de recepcion y administradores.
- Historial real de movimientos por paquete.
- Notificaciones automaticas al residente.
- Escaneo QR con camara.
- Exportacion de reportes.
- Registro de evidencias o firmas de retiro.

## Licencia

Este proyecto se distribuye bajo licencia MIT. Revisa el archivo `LICENSE` para mas detalle.
