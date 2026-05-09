import { useEffect, useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronRight, BookOpen, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import curriculumService, { Syllabus, SyllabusUnit, SyllabusTopic, SyllabusSubTopic } from '@/services/curriculum.service';

export default function TopicBreakdown() {
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [units, setUnits] = useState<SyllabusUnit[]>([]);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [subTopics, setSubTopics] = useState<SyllabusSubTopic[]>([]);
  const [selectedSyllabus, setSelectedSyllabus] = useState<string | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
      setSelectedSyllabus(syllabiRes.data?.[0]?.id ?? null);
    } catch (error) {
      console.error('Failed to load topic breakdown', error);
    }
  };

  const filteredUnits = useMemo(() => {
    if (!selectedSyllabus) return [];
    let activeUnits = units.filter((unit) => unit.syllabus === selectedSyllabus);
    if (!searchText) return activeUnits;

    const normalized = searchText.toLowerCase();
    return activeUnits.filter((unit) =>
      unit.title.toLowerCase().includes(normalized) ||
      unit.description?.toLowerCase().includes(normalized) ||
      topics.some((topic) => topic.unit === unit.id && topic.title.toLowerCase().includes(normalized)) ||
      subTopics.some((sub) => {
        const topic = topics.find((topic) => topic.id === sub.topic);
        return topic?.unit === unit.id && sub.title.toLowerCase().includes(normalized);
      })
    );
  }, [selectedSyllabus, units, topics, subTopics, searchText]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Topic Breakdown</h1>
          <p className="text-gray-500">Browse the full unit → topic → sub-topic hierarchy with a searchable tree view.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search units, topics, sub-topics"
            className="max-w-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Syllabi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {syllabi.map((syllabus) => (
              <button
                key={syllabus.id}
                onClick={() => setSelectedSyllabus(syllabus.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedSyllabus === syllabus.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-400'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-gray-900">{syllabus.title}</span>
                  <Badge variant={syllabus.is_active ? 'success' : 'secondary'}>{syllabus.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                {syllabus.description && <p className="mt-2 text-sm text-gray-500">{syllabus.description}</p>}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hierarchy Tree</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedSyllabus ? (
              <p className="text-sm text-gray-500">Choose a syllabus to show the breakdown.</p>
            ) : (
              <div className="space-y-4">
                {filteredUnits.length === 0 ? (
                  <p className="text-sm text-gray-500">No units match your search.</p>
                ) : (
                  filteredUnits.map((unit) => {
                    const unitTopics = topics.filter((topic) => topic.unit === unit.id);
                    return (
                      <div key={unit.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <button
                          onClick={() => setExpandedUnits((prev) => ({ ...prev, [unit.id]: !prev[unit.id] }))}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                            {expandedUnits[unit.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span>{unit.title}</span>
                          </div>
                          <Badge variant={unit.is_active ? 'success' : 'secondary'}>{unit.is_active ? 'Active' : 'Inactive'}</Badge>
                        </button>
                        {expandedUnits[unit.id] && (
                          <div className="mt-4 space-y-3">
                            {unitTopics.map((topic) => {
                              const topicSubTopics = subTopics.filter((sub) => sub.topic === topic.id);
                              return (
                                <div key={topic.id} className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
                                  <button
                                    onClick={() => setExpandedTopics((prev) => ({ ...prev, [topic.id]: !prev[topic.id] }))}
                                    className="flex w-full items-center justify-between gap-3 text-left"
                                  >
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                      {expandedTopics[topic.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      <span>{topic.title}</span>
                                    </div>
                                    <Badge variant={topic.is_active ? 'secondary' : 'secondary'}>{topicSubTopics.length} sub-topics</Badge>
                                  </button>
                                  {expandedTopics[topic.id] && (
                                    <div className="mt-3 space-y-2 pl-6">
                                      {topicSubTopics.map((sub) => (
                                        <div key={sub.id} className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white p-3">
                                          <Layers className="h-4 w-4 text-teal-600" />
                                          <div>
                                            <p className="text-sm font-medium text-gray-900">{sub.title}</p>
                                            {sub.summary && <p className="text-sm text-gray-500">{sub.summary}</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
