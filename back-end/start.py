#!/usr/bin/env python
import os
import subprocess
import sys

def main():
    print("🚀 Iniciando aplicación Django con Daphne...")
    
    # Ejecutar migraciones
    print("📋 Aplicando migraciones...")
    try:
        subprocess.run([sys.executable, "manage.py", "migrate", "--noinput"], check=True)
        print("✅ Migraciones aplicadas correctamente")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error en migraciones: {e}")
        sys.exit(1)
    
    # Obtener puerto de la variable de entorno
    port = os.environ.get("PORT", "8000")
    print(f"🌐 Iniciando servidor Daphne en puerto {port}...")
    
    # Iniciar Daphne
    try:
        subprocess.run([
            "daphne", 
            "-b", "0.0.0.0", 
            "-p", str(port), 
            "backend.asgi:application"
        ], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error iniciando Daphne: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
