import { useState } from 'react'
import { Plus, Edit, Trash2, FileText, Copy, Eye, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface TranscriptTemplate {
  id: number
  name: string
  type: 'official' | 'unofficial' | 'provisional'
  is_default: boolean
  last_modified: string
}

export default function TranscriptTemplates() {
  const [templates, setTemplates] = useState<TranscriptTemplate[]>([
    { id: 1, name: 'Official Transcript - Standard', type: 'official', is_default: true, last_modified: '2024-12-01' },
    { id: 2, name: 'Unofficial Transcript', type: 'unofficial', is_default: false, last_modified: '2024-11-15' },
    { id: 3, name: 'Provisional Certificate', type: 'provisional', is_default: false, last_modified: '2024-10-20' },
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transcript Templates</h1>
          <p className="text-gray-500 mt-1">Design and manage transcript formats</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
                {template.is_default && <Badge variant="success">Default</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Type: <span className="capitalize">{template.type}</span></p>
                <p className="text-sm text-gray-600">Last Modified: {template.last_modified}</p>
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Preview
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Duplicate
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <Edit className="w-3 h-3" /> Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Template Preview - Official Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold">ERP V2 University</h3>
              <p className="text-sm">Official Transcript of Academic Record</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="font-medium">Student Name:</span> _________________</div>
              <div><span className="font-medium">Roll Number:</span> _________________</div>
              <div><span className="font-medium">Program:</span> _________________</div>
              <div><span className="font-medium">CGPA:</span> _________________</div>
            </div>
            <div className="border-t pt-4 text-center text-xs text-gray-400">
              This is a sample template preview
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
