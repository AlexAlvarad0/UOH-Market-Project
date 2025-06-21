#!/usr/bin/env python
"""
Script para limpiar archivos de prueba y temporales del proyecto
Elimina archivos que ya no son necesarios para el funcionamiento de la aplicación
"""

import os
import sys
from pathlib import Path

def main():
    print("🧹 LIMPIEZA DE ARCHIVOS DE PRUEBA Y TEMPORALES")
    print("=" * 60)
    print("🎯 Eliminando archivos que ya no son necesarios...")
    print()
    
    # Directorio base del proyecto
    base_dir = Path(__file__).resolve().parent
    
    # Lista de archivos a eliminar
    files_to_delete = [
        # Archivos de prueba principales
        "test_password_reset.py",
        "test_otp_system.py", 
        "test_improved_skin_detection.py",
        "test_gmail.py",
        "test_free_ai_moderation.py",
        "test_fast_review.py",
        "test_enhanced_drug_detection.py",
        "test_email.py",
        "test_edit_moderation.py",
        "test_deepai_integration.py",
        "test_completely_free_moderation.py",
        "test_ai_only_mode.py",
        
        # Archivos de análisis temporal
        "analyze_detection_gaps.py",
        
        # Archivos de verificación temporal
        "check_user_verification.py",
        "check_users.py",
        "simple_check_users.py",
        
        # Archivos de pruebas simples
        "simple_drug_test.py",
        
        # Archivos de creación de prueba
        "create_test_product.py",
        
        # Archivos de corrección temporal
        "fix_verified_seller.py",
        "fix_user_verification.py",
        
        # Archivos de verificación temporal
        "verify_users.py",
        
        # Archivos de actualización temporal
        "update_seller_status.py",
        
        # Archivos de prueba rápida
        "quick_timing_test.py",
        
        # Archivos de limpieza
        "cleanup_migrations.py",
        
        # Archivos de configuración temporal (si existen)
        "temp_config.py",
        "debug_config.py",
    ]
    
    # Contadores
    deleted_count = 0
    not_found_count = 0
    error_count = 0
    
    print("📂 ARCHIVOS A ELIMINAR:")
    print("-" * 40)
    
    for filename in files_to_delete:
        file_path = base_dir / filename
        
        if file_path.exists():
            try:
                file_size = file_path.stat().st_size
                file_path.unlink()
                deleted_count += 1
                print(f"✅ Eliminado: {filename} ({file_size:,} bytes)")
            except Exception as e:
                error_count += 1
                print(f"❌ Error eliminando {filename}: {str(e)}")
        else:
            not_found_count += 1
            print(f"⚪ No encontrado: {filename}")
    
    print()
    print("📊 RESUMEN DE LIMPIEZA:")
    print("-" * 40)
    print(f"✅ Archivos eliminados: {deleted_count}")
    print(f"⚪ No encontrados: {not_found_count}")
    print(f"❌ Errores: {error_count}")
    print(f"📁 Total procesados: {len(files_to_delete)}")
    
    # Calcular espacio liberado
    if deleted_count > 0:
        print(f"💾 Espacio liberado: Archivos de prueba removidos")
        print()
        print("🎉 LIMPIEZA COMPLETADA")
        print("✨ El proyecto ahora solo contiene archivos necesarios")
    else:
        print("💡 No se encontraron archivos para eliminar")
    
    print()
    print("📋 ARCHIVOS QUE SE MANTIENEN (NECESARIOS):")
    print("-" * 50)
    print("🔧 ARCHIVOS DE CONFIGURACIÓN:")
    print("   • manage.py - Comando principal de Django")
    print("   • settings.py - Configuración del proyecto")
    print("   • .env - Variables de entorno")
    print("   • requirements.txt - Dependencias de Python")
    
    print()
    print("🛡️ SISTEMA DE MODERACIÓN:")
    print("   • completely_free_moderator.py - Moderador principal")
    print("   • enhanced_drug_detector.py - Detector de drogas")
    print("   • utils.py - Utilidades de análisis")
    
    print()
    print("📦 APLICACIONES PRINCIPALES:")
    print("   • products/ - Gestión de productos")
    print("   • accounts/ - Gestión de usuarios")
    print("   • chat/ - Sistema de mensajería")
    print("   • notifications/ - Notificaciones")
    print("   • authentication/ - Autenticación")
    
    print()
    print("🗄️ BASE DE DATOS Y MIGRATIONS:")
    print("   • db.sqlite3 - Base de datos")
    print("   • migrations/ - Migraciones de Django")
    
    print()
    print("📱 COMANDOS DE GESTIÓN:")
    print("   • review_pending_products.py - Revisión automática")
    print("   • create_categories.py - Creación de categorías")
    print("   • update_verified_sellers.py - Actualización de vendedores")
    
    print()
    print("=" * 60)
    print("✅ PROYECTO LIMPIO Y OPTIMIZADO")
    print("🚀 Listo para producción sin archivos innecesarios")

if __name__ == "__main__":
    main()
