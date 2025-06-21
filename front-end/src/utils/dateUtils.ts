/**
 * Utilidades para manejo de fechas sin problemas de zona horaria
 */

/**
 * Convierte una fecha a formato YYYY-MM-DD sin conversiones de zona horaria
 * @param date - La fecha a convertir (string, Date, o null)
 * @returns Fecha en formato YYYY-MM-DD o string vacío si es null/undefined
 */
export const formatDateForInput = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Si ya está en formato YYYY-MM-DD, devolverlo tal como está
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      
      // Si es una fecha ISO, extraer solo la parte de fecha
      if (date.includes('T')) {
        return date.split('T')[0];
      }
      
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    // Usar toISOString y extraer solo la parte de fecha para evitar problemas de zona horaria
    return dateObj.toISOString().split('T')[0];  } catch {
    return '';
  }
};

/**
 * Convierte una fecha del input date al formato esperado por el backend
 * @param dateString - Fecha en formato YYYY-MM-DD del input
 * @returns Fecha formateada para el backend
 */
export const formatDateForBackend = (dateString: string): string => {
  if (!dateString) return '';
    // Validar que esté en formato correcto
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return '';
  }
  
  return dateString;
};

/**
 * Parsea una fecha del backend sin conversiones de zona horaria
 * @param dateString - Fecha del backend
 * @returns Fecha formateada para mostrar en el input
 */
export const parseDateFromBackend = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  // Si ya es una fecha simple YYYY-MM-DD, devolverla tal como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Si incluye tiempo (ISO), extraer solo la fecha
  if (dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  
  return formatDateForInput(dateString);
};
