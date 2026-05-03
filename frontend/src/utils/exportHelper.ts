/**
 * Export Helper Utilities
 * Provides utilities for exporting data in various formats
 */

import { toastManager } from '../services/notification.service';

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
): void {
  try {
    if (data.length === 0) {
      toastManager.warning('No Data', 'No data to export');
      return;
    }

    // Get column keys from first object or use provided columns
    const keys = columns 
      ? columns.map(c => c.key) 
      : (Object.keys(data[0]) as (keyof T)[]);

    // Create headers
    const headers = columns 
      ? columns.map(c => c.header).join(',')
      : keys.join(',');

    // Create rows
    const rows = data.map(row => {
      return keys.map(key => {
        const value = row[key];
        // Handle values that need quoting
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',');
    });

    // Combine headers and rows
    const csv = [headers, ...rows].join('\n');

    // Create blob and download
    downloadBlob(csv, `${filename}.csv`, 'text/csv');
    toastManager.success('Export Complete', `${filename}.csv downloaded`);
  } catch (error) {
    console.error('CSV export error:', error);
    toastManager.error('Export Failed', 'Failed to export CSV');
  }
}

/**
 * Export data to JSON format
 */
export function exportToJSON<T>(
  data: T,
  filename: string,
  pretty: boolean = true
): void {
  try {
    const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    downloadBlob(json, `${filename}.json`, 'application/json');
    toastManager.success('Export Complete', `${filename}.json downloaded`);
  } catch (error) {
    console.error('JSON export error:', error);
    toastManager.error('Export Failed', 'Failed to export JSON');
  }
}

/**
 * Export data to Excel format (XML Spreadsheet)
 * Note: For full Excel support, consider using a library like xlsx
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  sheetName: string = 'Sheet1',
  columns?: { key: keyof T; header: string }[]
): void {
  const filename = 'export';
  try {
    if (data.length === 0) {
      toastManager.warning('No Data', 'No data to export');
      return;
    }

    const keys = columns 
      ? columns.map(c => c.key) 
      : (Object.keys(data[0]) as (keyof T)[]);

    const headers = columns 
      ? columns.map(c => c.header) 
      : keys.map(k => String(k));

    // Create XML for Excel
    let xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
    xml += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
    xml += `<Worksheet ss:Name="${sheetName}"><Table>`;

    // Headers
    xml += '<Row>';
    for (const header of headers) {
      xml += `<Cell><Data ss:Type="String">${escapeXml(String(header))}</Data></Cell>`;
    }
    xml += '</Row>';

    // Data rows
    for (const row of data) {
      xml += '<Row>';
      for (const key of keys) {
        const value = row[key];
        const type = typeof value === 'number' ? 'Number' : 'String';
        xml += `<Cell><Data ss:Type="${type}">${escapeXml(String(value ?? ''))}</Data></Cell>`;
      }
      xml += '</Row>';
    }

    xml += '</Table></Worksheet></Workbook>';

    downloadBlob(xml, `${filename}.xls`, 'application/vnd.ms-excel');
    toastManager.success('Export Complete', `${filename}.xls downloaded`);
  } catch (error) {
    console.error('Excel export error:', error);
    toastManager.error('Export Failed', 'Failed to export Excel');
  }
}

/**
 * Export data to PDF format
 * Note: For full PDF support, consider using a library like jspdf
 */
export function exportToPDF<T extends Record<string, any>>(
  data: T[],
  title: string,
  columns?: { key: keyof T; header: string }[]
): void {
  try {
    if (data.length === 0) {
      toastManager.warning('No Data', 'No data to export');
      return;
    }

    const keys = columns 
      ? columns.map(c => c.key) 
      : (Object.keys(data[0]) as (keyof T)[]);

    const headers = columns 
      ? columns.map(c => c.header) 
      : keys.map(k => String(k));

    // Create simple HTML for PDF conversion
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    tr:nth-child(even) { background-color: #fafafa; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Exported: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>${keys.map(k => `<td>${row[k] ?? ''}</td>`).join('')}</tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toastManager.success('Export Complete', 'PDF opened in new window');
  } catch (error) {
    console.error('PDF export error:', error);
    toastManager.error('Export Failed', 'Failed to export PDF');
  }
}

/**
 * Export table to HTML format
 */
export function exportToHTML<T extends Record<string, any>>(
  data: T[],
  filename: string,
  title: string,
  columns?: { key: keyof T; header: string }[]
): void {
  try {
    if (data.length === 0) {
      toastManager.warning('No Data', 'No data to export');
      return;
    }

    const keys = columns 
      ? columns.map(c => c.key) 
      : (Object.keys(data[0]) as (keyof T)[]);

    const headers = columns 
      ? columns.map(c => c.header) 
      : keys.map(k => String(k));

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
    h1 { color: #1a1a1a; }
    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e5e5; padding: 10px; text-align: left; }
    th { background-color: #f9f9f9; font-weight: 600; }
    tr:hover { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Exported: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>${keys.map(k => `<td>${row[k] ?? ''}</td>`).join('')}</tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

    downloadBlob(html, `${filename}.html`, 'text/html');
    toastManager.success('Export Complete', `${filename}.html downloaded`);
  } catch (error) {
    console.error('HTML export error:', error);
    toastManager.error('Export Failed', 'Failed to export HTML');
  }
}

/**
 * Print data in table format
 */
export function printData<T extends Record<string, any>>(
  data: T[],
  title: string,
  columns?: { key: keyof T; header: string }[]
): void {
  const keys = columns 
    ? columns.map(c => c.key) 
    : (Object.keys(data[0]) as (keyof T)[]);

  const headers = columns 
    ? columns.map(c => c.header) 
    : keys.map(k => String(k));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @media print { body { -webkit-print-color-adjust: exact; } }
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    th { background-color: #eee; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Printed: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>${keys.map(k => `<td>${row[k] ?? ''}</td>`).join('')}</tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

// Helper functions

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format number for export
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format date for export
 */
export function formatDate(date: string | Date, format: 'short' | 'long' | 'iso' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'long':
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    case 'iso':
      return d.toISOString();
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Format currency for export
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency 
  }).format(value);
}