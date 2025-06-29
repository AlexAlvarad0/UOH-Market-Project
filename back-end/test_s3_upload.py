import os
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from products.models import Product, ProductImage, Category
from django.contrib.auth import get_user_model

# Este script debe ejecutarse con Django shell o como un comando de gestión

def test_s3_upload():
    # Crear usuario de prueba
    User = get_user_model()
    user, _ = User.objects.get_or_create(username='test_s3_user', defaults={'email': 'test@uoh.cl', 'password': 'test1234'})
    # Crear categoría de prueba
    category, _ = Category.objects.get_or_create(name='TestCat')
    # Crear producto de prueba
    product = Product.objects.create(
        title='Test S3 Product',
        description='Test S3 upload',
        price=1000,
        seller=user,
        category=category,
        condition='new',
        status='pending'
    )
    # Crear imagen de prueba
    image_path = os.path.join(settings.BASE_DIR, 'media', 'test.jpg')
    # Si no existe, crea una imagen dummy
    if not os.path.exists(image_path):
        from PIL import Image
        img = Image.new('RGB', (100, 100), color = (73, 109, 137))
        img.save(image_path)
    with open(image_path, 'rb') as f:
        image_file = SimpleUploadedFile('test.jpg', f.read(), content_type='image/jpeg')
        img_instance = ProductImage.objects.create(product=product, image=image_file, is_primary=True)
        img_instance.save()
        print('URL de la imagen subida:', img_instance.image.url)
        print('MEDIA_URL:', settings.MEDIA_URL)
        print('¿La URL contiene el bucket?:', settings.AWS_STORAGE_BUCKET_NAME in img_instance.image.url)

if __name__ == '__main__':
    test_s3_upload()
