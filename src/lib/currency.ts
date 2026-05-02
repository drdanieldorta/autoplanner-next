/**
 * Utility functions for currency handling
 * Always store values in cents (integers) in the backend
 */

/**
 * Format cents to Brazilian Real currency display
 * @param cents - Value in cents (integer)
 * @returns Formatted currency string (e.g., "R$ 1.234,56")
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

/**
 * Parse currency string to cents
 * @param value - Currency string (e.g., "R$ 1.234,56" or "1234,56")
 * @returns Value in cents (integer)
 */
export function parseCurrency(value: string): number {
  // Remove all non-numeric characters except comma and period
  const cleaned = value.replace(/[^\d,.-]/g, '');
  
  // Handle Brazilian format: 1.234,56 -> 1234.56
  const normalized = cleaned
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Replace decimal comma with period
  
  const parsed = parseFloat(normalized);
  return Math.round((isNaN(parsed) ? 0 : parsed) * 100);
}

/**
 * Format currency input value (for controlled inputs)
 * @param value - Current input value
 * @returns Formatted value for display
 */
export function formatCurrencyInput(value: string): string {
  const cents = parseCurrency(value);
  if (cents === 0) return '';
  return formatCurrency(cents);
}