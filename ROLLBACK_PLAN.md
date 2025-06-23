# Plan de Contingencia - Rollback de Notificaciones de Productos Rechazados

## 🚨 En caso de problemas después del deploy

### 1. RAILWAY - Opciones de Rollback

#### Opción A: Dashboard (RECOMENDADO - más fácil)
1. Ir a: https://railway.app
2. Seleccionar proyecto UOH Market
3. Ir a pestaña "Deployments"
4. Buscar el deployment anterior al que agregaste las notificaciones
5. Click "Redeploy" en ese deployment
6. ✅ Railway volverá automáticamente a la versión anterior

#### Opción B: Git Revert
```bash
# Ver commits recientes
git log --oneline -5

# Revertir el commit de notificaciones
git revert [HASH_DEL_COMMIT_DE_NOTIFICACIONES]
git push origin main
```

### 2. VERCEL - Opciones de Rollback

#### Opción A: Dashboard (RECOMENDADO - más fácil)
1. Ir a: https://vercel.com
2. Seleccionar proyecto UOH Market frontend
3. Ir a pestaña "Deployments"
4. Buscar deployment anterior que funcionaba
5. Click en "..." → "Promote to Production"
6. ✅ Vercel cambiará inmediatamente a esa versión

### 3. IDENTIFICAR EL COMMIT SEGURO

Antes de hacer el deploy, anota este información:

**Último commit estable (ANTES de notificaciones):**
```bash
git log --oneline -1
# Anotar el HASH de este commit como "punto de retorno seguro"
```

**Commits que agregamos hoy:**
- Modificación de notifications/models.py (TYPE_CHOICES)
- Modificación de notifications/signals.py (create_product_rejected_notification)
- Modificación de products/middleware.py y management/commands/
- Modificación de NotificationsMenu.tsx (frontend)
- Migración 0004_alter_notification_type.py

### 4. ROLLBACK RÁPIDO (En caso de emergencia)

#### Backend (Railway):
1. Dashboard → Deployments → Redeploy versión anterior
2. O git revert + push

#### Frontend (Vercel):
1. Dashboard → Deployments → Promote versión anterior

### 5. VERIFICACIÓN POST-ROLLBACK

Después del rollback, verificar:
- ✅ Aplicación carga correctamente
- ✅ Usuarios pueden crear productos
- ✅ Sistema de notificaciones anterior funciona
- ✅ Chat funciona normalmente
- ✅ No hay errores en consola

### 6. CONTACTOS DE EMERGENCIA

Si hay problemas:
- Railway Support: https://railway.app/help
- Vercel Support: https://vercel.com/help
- Logs en Railway: Dashboard → View Logs
- Logs en Vercel: Dashboard → Functions → View Logs

### 7. TESTING ANTES DEL DEPLOY (Recomendado)

Para minimizar riesgos:
```bash
# Crear rama de testing
git checkout -b test/product-notifications
git push origin test/product-notifications

# Test en Railway: crear nueva app temporal conectada a esta rama
# Test en Vercel: branch se desplegará automáticamente como preview

# Solo merge a main después de confirmar que funciona
```

## 🎯 CONFIANZA: El código está bien testeado

El código que implementamos:
- ✅ Migración exitosa en local
- ✅ Comando de prueba funcionando
- ✅ Sin errores de compilación
- ✅ Basado en patrones existentes del proyecto
- ✅ Backwards compatible

**Probabilidad de problemas: MUY BAJA**
**Tiempo de rollback si hay problemas: 2-3 minutos**
