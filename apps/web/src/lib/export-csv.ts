/**
 * CSV Export Utility for PROORGA Banking SaaS
 * Includes UTF-8 BOM (\uFEFF) for native Microsoft Excel compatibility on Windows & macOS,
 * preserving French accents and Arabic characters.
 */

export interface CsvColumn<T = any> {
  key: string;
  label: string;
  transform?: (value: any, row: T) => string | number | boolean | null | undefined;
}

export function exportToCsv<T = any>(
  filename: string,
  columns: CsvColumn<T>[],
  data: T[]
): void {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter.');
    return;
  }

  // Header row
  const headerRow = columns
    .map((col) => `"${escapeCsv(col.label)}"`)
    .join(';');

  // Data rows
  const dataRows = data.map((row: any) => {
    return columns
      .map((col) => {
        let val: any;
        if (col.transform) {
          val = col.transform(getNestedValue(row, col.key), row);
        } else {
          val = getNestedValue(row, col.key);
        }

        if (val === null || val === undefined) {
          return '""';
        }

        return `"${escapeCsv(String(val))}"`;
      })
      .join(';');
  });

  // UTF-8 BOM prefix (\uFEFF) ensures Excel renders accented characters (é, è, à) and Arabic correctly
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(text: string): string {
  return text.replace(/"/g, '""');
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}
