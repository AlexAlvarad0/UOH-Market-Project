/**
 * Recorta una imagen automáticamente para convertirla en un cuadrado perfecto (relación 1:1)
 * @param file El archivo de imagen a recortar
 * @returns Promise con el archivo de imagen recortado
 */
export const createSquareImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      try {
        // Determinar el lado más pequeño para hacer un cuadrado perfecto
        const size = Math.min(img.width, img.height);
        
        // Calcular posición de inicio para centrar el recorte
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        
        // Crear un canvas para manipular la imagen
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        // Dibujar la porción recortada en el canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo crear el contexto del canvas'));
          return;
        }
        
        ctx.drawImage(
          img,
          startX, startY, // Punto de inicio del recorte (centrado)
          size, size,     // Tamaño del recorte (cuadrado)
          0, 0,           // Posición en el canvas
          size, size      // Tamaño en el canvas
        );
        
        // Convertir canvas a Blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Crear un nuevo archivo con el mismo nombre pero en formato cuadrado
            const squaredFile = new File([blob], file.name, {
              type: file.type,
              lastModified: file.lastModified
            });
            
            // Liberar memoria
            URL.revokeObjectURL(url);
            
            resolve(squaredFile);
          } else {
            reject(new Error('Error al convertir canvas a blob'));
          }
        }, file.type);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error al cargar la imagen'));
    };
    
    img.src = url;
  });
};

/**
 * Procesa múltiples archivos para convertirlos a formato cuadrado
 */
export const processImages = async (files: File[]): Promise<File[]> => {
  const processedFiles: File[] = [];
  
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      try {
        const squaredImage = await createSquareImage(file);
        processedFiles.push(squaredImage);
      } catch (error) {
        console.error('Error al procesar imagen:', error);
        // Si hay error, usar la imagen original
        processedFiles.push(file);
      }
    } else {
      // Si no es imagen, mantenerlo igual
      processedFiles.push(file);
    }
  }
  
  return processedFiles;
};
