import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface AccreditationBody {
  id: number
  name: string
  code: string
  country: string
  website: string
  status: 'active' | 'inactive'
  created_at: string
}

export default function AccreditationBodies() {
  const [bodies, setBodies] = useState<AccreditationBody[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch accreditation bodies
    fetchBodies()
  }, [])

  const fetchBodies = async () => {
    try {
      // API call will be implemented
      setLoading(false)
    } catch (error) {
      console.error('Error fetching bodies:', error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accreditation Bodies</h1>
          <p className="text-gray-500 mt-1">Manage accreditation and regulatory bodies</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Body
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bodies.map((body) => (
          <Card key={body.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">{body.name}</CardTitle>
                </div>
                <Badge variant={body.status === 'active' ? 'success' : 'secondary'}>
                  {body.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Code:</span> {body.code}</p>
                <p><span className="font-medium">Country:</span> {body.country}</p>
                <p><span className="font-medium">Website:</span> 
                  <a href={body.website} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline ml-1">
                    {body.website}
                  </a>
                </p>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> View
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Edit className="w-3 h-3" /> Edit
                </Button>
                <Button variant="destructive" size="sm" className="flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bodies.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No accreditation bodies found</p>
          <Button variant="outline" className="mt-3">Add First Body</Button>
        </div>
      )}
    </div>
  )
}
