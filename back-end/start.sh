#!/bin/bash

echo "🚀 Iniciando aplicación Django con Daphne..."

# Ejecutar migraciones
echo "📋 Aplicando migraciones..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# Verificar que Django esté funcionando
echo "🔍 Verificando configuración de Django..."
python manage.py check

# Iniciar Daphne
echo "🌐 Iniciando servidor Daphne en puerto $PORT..."
exec daphne -b 0.0.0.0 -p $PORT backend.asgi:application
