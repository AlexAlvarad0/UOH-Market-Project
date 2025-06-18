export function formatPrice(value: number | string): string {
  const numberValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
  if (isNaN(numberValue)) {
    return '';
  }
  // Retornar 'Gratis' si el precio es cero
  if (numberValue === 0) {
    return 'Gratis';
  }
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(numberValue);
}
