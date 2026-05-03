export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename = 'export.csv'
) {
  if (data.length === 0) return

  // Get all unique keys from all objects
  const headers = Array.from(
    new Set(data.flatMap((obj) => Object.keys(obj)))
  )

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'string') {
            // Escape quotes and wrap in quotes if contains comma
            const escaped = value.replace(/"/g, '""')
            return value.includes(',') || value.includes('"')
              ? `"${escaped}"`
              : escaped
          }
          if (value instanceof Date) {
            return value.toISOString()
          }
          return String(value)
        })
        .join(',')
    ),
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

export function exportToJSON<T>(
  data: T[],
  filename = 'export.json'
) {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  downloadBlob(blob, filename)
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename = 'export.xlsx'
) {
  // Simple Excel XML format (works without external libraries)
  if (data.length === 0) return

  const headers = Array.from(
    new Set(data.flatMap((obj) => Object.keys(obj)))
  )

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sheet1">
    <Table>
      <Row>
        ${headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}
      </Row>
      ${data
        .map(
          (row) => `
      <Row>
        ${headers
          .map((header) => {
            const value = row[header]
            const type = typeof value === 'number' ? 'Number' : 'String'
            const escaped = escapeXml(String(value ?? ''))
            return `<Cell><Data ss:Type="${type}">${escaped}</Data></Cell>`
          })
          .join('')}
      </Row>`
        )
        .join('')}
    </Table>
  </Worksheet>
</Workbook>`

  const blob = new Blob([xmlContent], {
    type: 'application/vnd.ms-excel',
  })
  downloadBlob(blob, filename)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function exportSelectedRows<T extends { id?: number }>(
  data: T[],
  selectedIds: number[],
  columns: { key: keyof T; header: string }[],
  format: 'csv' | 'json' | 'excel' = 'csv'
) {
  const selectedData = data.filter((item) =>
    selectedIds.includes(item.id!)
  )

  // Transform to simple objects with only selected columns
  const exportData = selectedData.map((item) => {
    const row: Record<string, unknown> = {}
    columns.forEach((col) => {
      row[col.header] = item[col.key]
    })
    return row
  })

  switch (format) {
    case 'csv':
      exportToCSV(exportData, `export-${Date.now()}.csv`)
      break
    case 'json':
      exportToJSON(exportData, `export-${Date.now()}.json`)
      break
    case 'excel':
      exportToExcel(exportData, `export-${Date.now()}.xlsx`)
      break
  }
}