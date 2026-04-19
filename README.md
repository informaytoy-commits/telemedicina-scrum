# telemedicina-scrum
# Proyecto Telemedicina - Sprint 1
## 🔧 Requisitos
Antes de ejecutar el proyecto debes tener instalado:
- Node.js
- PostgreSQL
---
## 🚀 Cómo ejecutar el proyecto
1. Descargar o abrir la carpeta del proyecto
2. Abrir la terminal dentro de la carpeta
3. Instalar dependencias:
```bash
npm install
4. Crear la base de datos en PostgreSQL con el nombre:
telemedicina
5. Crear un archivo .env en la raíz del proyecto y copiar esto:
PORT=3000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD
DB_NAME=telemedicina
(Reemplazar TU_PASSWORD por tu contraseña de PostgreSQL)
6. Crear la carpeta uploads si no existe
7. Ejecutar el proyecto:
npm run dev
8. Abrir en el navegador:
http://localhost:3000
⚠️ Notas
Si algo falla, ejecutar otra vez: npm install
Asegurarse que PostgreSQL esté activo
Verificar que el .env esté bien configurado
