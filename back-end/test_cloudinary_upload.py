import cloudinary
import cloudinary.uploader
import os

# Configuración explícita (puedes omitir si ya está en settings.py, pero aquí es útil para test)
cloudinary.config(
    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME', 'de8fjqyqj'),
    api_key = os.getenv('CLOUDINARY_API_KEY', '511759146199856'),
    api_secret = os.getenv('CLOUDINARY_API_SECRET', 'dhdZtgfRYw1C5uxh2YJLQs86u3s'),
    secure=True
)

# Cambia la ruta a una imagen local que tengas para probar
local_image_path = 'test_image.jpg'  # Debe existir en el mismo directorio

try:
    result = cloudinary.uploader.upload(
        local_image_path,
        folder='product_images',  # Así se sube a la carpeta correcta
        use_filename=True,
        unique_filename=True
    )
    print('URL segura:', result['secure_url'])
    print('Ruta Cloudinary:', result['public_id'])
except Exception as e:
    print('Error al subir la imagen:', e)
