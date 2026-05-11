import { useEffect, useState } from 'react';
import { Plus, UploadCloud, Link2, FileText, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import curriculumService, { LearningResource, SyllabusTopic } from '@/services/curriculum.service';

export default function ResourceManagement() {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form, setForm] = useState({ title: '', resource_type: 'document', url: '', related_topic: '', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    try {
      const [resourcesRes, topicsRes] = await Promise.all([
        curriculumService.getLearningResources(),
        curriculumService.getSyllabusTopics(),
      ]);
      setResources(Array.isArray(resourcesRes.data) ? resourcesRes.data : resourcesRes.data?.results ?? []);
      setTopics(Array.isArray(topicsRes.data) ? topicsRes.data : topicsRes.data?.results ?? []);
    } catch (error) {
      console.error('Failed to load resources', error);
      toast.error('Unable to load resources');
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter((resource) => {
    const normalized = searchText.toLowerCase();
    return (
      resource.title.toLowerCase().includes(normalized) ||
      resource.resource_type.toLowerCase().includes(normalized) ||
      resource.description?.toLowerCase().includes(normalized) ||
      resource.url?.toLowerCase().includes(normalized)
    );
  });

  const handleUpload = async () => {
    if (!form.title) {
      toast.error('Add a title for the resource');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('resource_type', form.resource_type);
      if (form.url) formData.append('url', form.url);
      if (form.description) formData.append('description', form.description);
      if (form.related_topic) formData.append('related_topic', form.related_topic);
      if (file) formData.append('file', file);

      await curriculumService.createLearningResource(formData);
      toast.success('Learning resource added');
      setShowModal(false);
      setForm({ title: '', resource_type: 'document', url: '', related_topic: '', description: '' });
      setFile(null);
      loadResources();
    } catch (error) {
      console.error('Upload failed', error);
      toast.error('Failed to upload resource');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await curriculumService.deleteLearningResource(id);
      toast.success('Resource deleted');
      loadResources();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete resource');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Learning Resources</h1>
          <p className="text-gray-500">Upload documents and external resources tied to syllabus topics.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <UploadCloud className="mr-2 h-4 w-4" /> Add Resource
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resource Library</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <div className="flex items-center gap-2 max-w-md w-full">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search resources"
              />
            </div>
            <Badge variant="secondary">{resources.length} resources</Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No learning resources found.</div>
          ) : (
            <div className="space-y-4">
              {filteredResources.map((resource) => (
                <div key={resource.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <FileText className="h-4 w-4 text-blue-600" />
                        {resource.title}
                      </div>
                      <p className="text-sm text-gray-500">{resource.description || 'No description provided.'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{resource.resource_type}</Badge>
                      {resource.related_topic && <Badge variant="secondary">Topic: {resource.related_topic}</Badge>}
                      {resource.url && (
                        <a href={resource.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                          <Link2 className="h-4 w-4" /> Open Link
                        </a>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleDelete(resource.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Learning Resource">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Resource title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              value={form.resource_type}
              onChange={(e) => setForm({ ...form, resource_type: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="document">Document</option>
              <option value="video">Video</option>
              <option value="link">Link</option>
              <option value="presentation">Presentation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">URL</label>
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">File</label>
            <input
              type="file"
              accept="*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Related Topic</label>
            <select
              value={form.related_topic}
              onChange={(e) => setForm({ ...form, related_topic: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>{topic.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={4} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleUpload}>Save Resource</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
