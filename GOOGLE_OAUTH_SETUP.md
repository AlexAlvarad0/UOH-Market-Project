# Configuración de Google OAuth para UOH Market

## ⚠️ ERROR ACTUAL: Cross-Origin-Opener-Policy

El error `Cross-Origin-Opener-Policy policy would block the window.postMessage call` indica que el dominio no está autorizado en Google Cloud Console.

## Solución Inmediata

### 1. Accede a Google Cloud Console
- Ve a: https://console.cloud.google.com/
- Selecciona tu proyecto actual

### 2. Configura los orígenes autorizados
- Ve a **APIs y servicios** > **Credenciales**
- Busca el Client ID: `806140741515-b6u96b645s99tpv7ua14q2gpq16cdmb6.apps.googleusercontent.com`
- Haz clic en el ícono de edición (lápiz)

### 3. Agrega estos orígenes en "Orígenes de JavaScript autorizados":
```
http://localhost:5173
http://localhost:3000
http://127.0.0.1:5173
http://127.0.0.1:3000
```

### 4. Guarda los cambios
- Espera 5-10 minutos para que se propaguen
- Limpia la caché del navegador
- Recarga la aplicación

---

## Configuración Completa (Si necesitas crear nuevo Client ID)

### 1. Crear un proyecto en Google Cloud Console
1. Ve a https://console.cloud.google.com/
2. Haz clic en "Seleccionar proyecto" en la parte superior
3. Haz clic en "NUEVO PROYECTO"
4. Nombre del proyecto: "UOH Market"
5. Haz clic en "CREAR"

### 2. Habilitar la API de Google Identity
1. En el menú lateral, ve a "APIs y servicios" > "Biblioteca"
2. Busca "Google Identity"
3. Haz clic en "Google Identity Toolkit API"
4. Haz clic en "HABILITAR"

### 3. Crear credenciales OAuth 2.0
1. Ve a "APIs y servicios" > "Credenciales"
2. Haz clic en "+ CREAR CREDENCIALES" > "ID de cliente OAuth 2.0"
3. Si es la primera vez, configura la pantalla de consentimiento:
   - Tipo de usuario: Externo
   - Nombre de la aplicación: "UOH Market"
   - Correo electrónico de asistencia: tu email
   - Dominios autorizados: localhost
   - Correo electrónico de contacto del desarrollador: tu email
   - Haz clic en "GUARDAR Y CONTINUAR"

4. Crear el cliente OAuth:
   - Tipo de aplicación: "Aplicación web"
   - Nombre: "UOH Market Web Client"
   - Orígenes de JavaScript autorizados:
     - http://localhost:3000
     - http://127.0.0.1:3000
   - URI de redirección autorizados:
     - http://localhost:3000
     - http://127.0.0.1:3000
   - Haz clic en "CREAR"

5. Copia el "ID de cliente" que aparece en el modal

### 4. Configurar en el proyecto
1. Reemplaza el GOOGLE_OAUTH2_CLIENT_ID en el archivo .env con tu ID real
2. También actualiza el Client ID en el componente React

### Cliente ID actual (temporal - no funciona):
999037628603-hkl6kacobme4qtqjr5n6f6p8ksqpnt9q.apps.googleusercontent.com

### Una vez que tengas tu Client ID real:
1. Reemplázalo en /back-end/.env
2. Reemplázalo en /front-end/src/components/GoogleLoginButton.tsx
