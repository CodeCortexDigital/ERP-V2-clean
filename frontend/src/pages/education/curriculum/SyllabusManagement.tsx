import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderTree, BookOpen, Layers, Edit3, Trash2, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import curriculumService, { Syllabus, SyllabusUnit, SyllabusTopic, SyllabusSubTopic } from '@/services/curriculum.service';

const DEFAULT_NEW_SYLLABUS = { title: '', description: '' };
const DEFAULT_NEW_UNIT = { title: '', description: '' };
const DEFAULT_NEW_TOPIC = { title: '', summary: '' };
const DEFAULT_NEW_SUBTOPIC = { title: '', summary: '' };

export default function SyllabusManagement() {
  const navigate = useNavigate();
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [units, setUnits] = useState<SyllabusUnit[]>([]);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [subTopics, setSubTopics] = useState<SyllabusSubTopic[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedSyllabus, setSelectedSyllabus] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showSubTopicModal, setShowSubTopicModal] = useState(false);
  const [newSyllabus, setNewSyllabus] = useState(DEFAULT_NEW_SYLLABUS);
  const [newUnit, setNewUnit] = useState(DEFAULT_NEW_UNIT);
  const [newTopic, setNewTopic] = useState(DEFAULT_NEW_TOPIC);
  const [newSubTopic, setNewSubTopic] = useState(DEFAULT_NEW_SUBTOPIC);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSyllabusData();
  }, []);

  const loadSyllabusData = async () => {
    setLoading(true);
    try {
      const [syllabiRes, unitsRes, topicsRes, subTopicsRes] = await Promise.all([
        curriculumService.getSyllabi(),
        curriculumService.getSyllabusUnits(),
        curriculumService.getSyllabusTopics(),
        curriculumService.getSyllabusSubTopics(),
      ]);

      setSyllabi(syllabiRes.data || []);
      setUnits(unitsRes.data || []);
      setTopics(topicsRes.data || []);
      setSubTopics(subTopicsRes.data || []);

      if (!selectedSyllabus && syllabiRes.data?.length > 0) {
        setSelectedSyllabus(syllabiRes.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load syllabus data', error);
      toast.error('Unable to load syllabus information');
    } finally {
      setLoading(false);
    }
  };

  const filteredSyllabi = useMemo(() => {
    if (!searchText) return syllabi;
    return syllabi.filter((s) =>
      s.title.toLowerCase().includes(searchText.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, syllabi]);

  const selectedUnits = units.filter((unit) => unit.syllabus === selectedSyllabus);
  const selectedTopics = topics.filter((topic) => selectedUnits.some((unit) => unit.id === topic.unit));
  const selectedSubTopics = subTopics.filter((sub) => selectedTopics.some((topic) => topic.id === sub.topic));

  const selectedUnitOptions = selectedUnits.map((unit) => ({ id: unit.id, title: unit.title }));
  const selectedTopicOptions = selectedTopics.map((topic) => ({ id: topic.id, title: topic.title }));

  const handleCreateSyllabus = async () => {
    if (!newSyllabus.title) {
      toast.error('Enter a syllabus title');
      return;
    }

    try {
      await curriculumService.createSyllabus({ ...newSyllabus, is_active: true });
      toast.success('Syllabus created');
      setNewSyllabus(DEFAULT_NEW_SYLLABUS);
      setShowSyllabusModal(false);
      loadSyllabusData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create syllabus');
    }
  };

  const handleCreateUnit = async () => {
    if (!selectedSyllabus || !newUnit.title) {
      toast.error('Select a syllabus and enter a unit title');
      return;
    }

    try {
      await curriculumService.createSyllabusUnit({ ...newUnit, syllabus: selectedSyllabus, is_active: true });
      toast.success('Unit added');
      setNewUnit(DEFAULT_NEW_UNIT);
      setShowUnitModal(false);
      loadSyllabusData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create unit');
    }
  };

  const handleCreateTopic = async () => {
    if (!selectedUnit || !newTopic.title) {
      toast.error('Select a unit and enter a topic title');
      return;
    }

    try {
      await curriculumService.createSyllabusTopic({ ...newTopic, unit: selectedUnit, is_active: true });
      toast.success('Topic added');
      setNewTopic(DEFAULT_NEW_TOPIC);
      setShowTopicModal(false);
      loadSyllabusData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create topic');
    }
  };

  const handleCreateSubTopic = async () => {
    if (!newSubTopic.title || !selectedTopic) {
      toast.error('Select a topic and enter a sub-topic title');
      return;
    }

    try {
      await curriculumService.createSyllabusSubTopic({ ...newSubTopic, topic: selectedTopic, is_active: true });
      toast.success('Sub-topic added');
      setNewSubTopic(DEFAULT_NEW_SUBTOPIC);
      setSelectedTopic(null);
      setShowSubTopicModal(false);
      loadSyllabusData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create sub-topic');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Syllabus Management</h1>
          <p className="text-gray-500">Create and review syllabus hierarchy: units, topics, and sub-topics.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowSyllabusModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Syllabus
          </Button>
          <Button variant="outline" onClick={() => setShowUnitModal(true)}>
            <BookOpen className="mr-2 h-4 w-4" /> Add Unit
          </Button>
          <Button variant="outline" onClick={() => setShowTopicModal(true)}>
            <Layers className="mr-2 h-4 w-4" /> Add Topic
          </Button>
          <Button variant="outline" onClick={() => setShowSubTopicModal(true)}>
            <Edit3 className="mr-2 h-4 w-4" /> Add Sub-Topic
          </Button>
        </div>
      </div>

      {/* Top Navigation Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700">
          <BookOpen className="w-4 h-4" />
          Syllabus
        </Button>
        <Button onClick={() => navigate('/education/curriculum/topics')} variant="outline" className="flex items-center gap-2">
          <FolderTree className="w-4 h-4" />
          Topic Breakdown
        </Button>
        <Button onClick={() => navigate('/education/curriculum/resources')} variant="outline" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Resources
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Available Syllabi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search syllabi"
              />
            </div>
            <div className="space-y-3">
              {filteredSyllabi.map((syllabus) => (
                <button
                  key={syllabus.id}
                  onClick={() => {
                    setSelectedSyllabus(syllabus.id);
                    const firstUnit = units.find((unit) => unit.syllabus === syllabus.id);
                    setSelectedUnit(firstUnit?.id ?? null);
                  }}
                  className={`block w-full text-left rounded-2xl border px-4 py-3 transition ${selectedSyllabus === syllabus.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-400'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{syllabus.title}</span>
                    <Badge variant={syllabus.is_active ? 'success' : 'secondary'}>{syllabus.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{syllabus.description || 'No description added yet.'}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedSyllabus ? (
                <p className="text-sm text-gray-500">Select a syllabus to view its structure.</p>
              ) : (
                <div className="space-y-4">
                  {selectedUnits.length === 0 && (
                    <p className="text-sm text-gray-500">No units created for this syllabus yet.</p>
                  )}
                  {selectedUnits.map((unit) => (
                    <div key={unit.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                            <FolderTree className="h-4 w-4 text-blue-600" />
                            {unit.title}
                          </div>
                          <p className="text-sm text-gray-500">{unit.description || 'Unit summary not provided.'}</p>
                        </div>
                        <Badge variant={unit.is_active ? 'success' : 'secondary'}>{unit.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>

                      <div className="mt-4 space-y-3">
                        {topics.filter((topic) => topic.unit === unit.id).map((topic) => (
                          <div key={topic.id} className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                  <BookOpen className="h-4 w-4 text-purple-600" />
                                  {topic.title}
                                </div>
                                <p className="text-sm text-gray-500">{topic.summary || 'Topic summary not available.'}</p>
                              </div>
                              <Badge variant={topic.is_active ? 'secondary' : 'secondary'}>{topic.is_active ? 'Visible' : 'Hidden'}</Badge>
                            </div>

                            <div className="mt-3 space-y-2">
                              {subTopics.filter((sub) => sub.topic === topic.id).map((sub) => (
                                <div key={sub.id} className="rounded-xl border border-gray-200 bg-white p-3">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                    <Layers className="h-4 w-4 text-teal-600" />
                                    {sub.title}
                                  </div>
                                  <p className="text-sm text-gray-500">{sub.summary || 'No sub-topic description.'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={showSyllabusModal} onClose={() => setShowSyllabusModal(false)} title="Create New Syllabus">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <Input value={newSyllabus.title} onChange={(e) => setNewSyllabus({ ...newSyllabus, title: e.target.value })} placeholder="Syllabus title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={newSyllabus.description}
              onChange={(e) => setNewSyllabus({ ...newSyllabus, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows={4}
              placeholder="Syllabus description"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowSyllabusModal(false)}>Cancel</Button>
            <Button onClick={handleCreateSyllabus}>Save Syllabus</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showUnitModal} onClose={() => setShowUnitModal(false)} title="Add Unit">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit Title</label>
            <Input value={newUnit.title} onChange={(e) => setNewUnit({ ...newUnit, title: e.target.value })} placeholder="Unit title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={newUnit.description}
              onChange={(e) => setNewUnit({ ...newUnit, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows={3}
              placeholder="Unit summary"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowUnitModal(false)}>Cancel</Button>
            <Button onClick={handleCreateUnit}>Save Unit</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showTopicModal} onClose={() => setShowTopicModal(false)} title="Add Topic">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Topic Title</label>
            <Input value={newTopic.title} onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })} placeholder="Topic title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Summary</label>
            <textarea
              value={newTopic.summary}
              onChange={(e) => setNewTopic({ ...newTopic, summary: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows={3}
              placeholder="Topic summary"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowTopicModal(false)}>Cancel</Button>
            <Button onClick={handleCreateTopic}>Save Topic</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSubTopicModal} onClose={() => setShowSubTopicModal(false)} title="Add Sub-Topic">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Topic</label>
            <select
              value={selectedTopic || ''}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select topic</option>
              {selectedTopicOptions.map((topic) => (
                <option key={topic.id} value={topic.id}>{topic.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Sub-Topic Title</label>
            <Input value={newSubTopic.title} onChange={(e) => setNewSubTopic({ ...newSubTopic, title: e.target.value })} placeholder="Sub-topic title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={newSubTopic.summary}
              onChange={(e) => setNewSubTopic({ ...newSubTopic, summary: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows={3}
              placeholder="Sub-topic summary"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowSubTopicModal(false)}>Cancel</Button>
            <Button onClick={handleCreateSubTopic}>Save Sub-topic</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
