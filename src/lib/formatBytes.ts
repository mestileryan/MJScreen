const UNITS = ['o', 'Ko', 'Mo', 'Go', 'To']

/** `12,3 Mo`, à la française, avec une décimale au-delà du kilo-octet. */
export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000
    unit++
  }
  const text = unit === 0 ? String(Math.round(value)) : value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
  return `${text} ${UNITS[unit]}`
}
