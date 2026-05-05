import { useState, useEffect } from 'react';
import classSectionService, { ClassWithSections, Section } from '@/services/classSection.service';

interface ClassSectionSelectorProps {
  onClassChange?: (classId: string, className: string) => void;
  onSectionChange?: (sectionId: string, sectionName: string) => void;
  selectedClassId?: string;
  selectedSectionId?: string;
  showSection?: boolean;
  className?: string;
}

export default function ClassSectionSelector({
  onClassChange,
  onSectionChange,
  selectedClassId: externalClassId,
  selectedSectionId: externalSectionId,
  showSection = true,
  className = ''
}: ClassSectionSelectorProps) {
  const [classes, setClasses] = useState<ClassWithSections[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(externalClassId || '');
  const [selectedSection, setSelectedSection] = useState<string>(externalSectionId || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (externalClassId !== undefined) {
      setSelectedClass(externalClassId);
      if (externalClassId) {
        loadSectionsForClass(externalClassId);
      }
    }
  }, [externalClassId]);

  useEffect(() => {
    if (externalSectionId !== undefined) {
      setSelectedSection(externalSectionId);
    }
  }, [externalSectionId]);

  const loadClasses = async () => {
    try {
      const response = await classSectionService.getClassesWithSections();
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSectionsForClass = async (classId: string) => {
    try {
      const response = await classSectionService.getSectionsForClass(classId);
      setSections(response.data);
    } catch (error) {
      console.error('Failed to load sections:', error);
      setSections([]);
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setSelectedSection('');
    setSections([]);
    
    const selectedClassData = classes.find(c => c.id === classId);
    if (selectedClassData) {
      onClassChange?.(classId, selectedClassData.name);
      loadSectionsForClass(classId);
    }
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sectionId = e.target.value;
    setSelectedSection(sectionId);
    const selectedSectionData = sections.find(s => s.id === sectionId);
    if (selectedSectionData) {
      onSectionChange?.(sectionId, selectedSectionData.name);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-10 rounded"></div>;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Class <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedClass}
          onChange={handleClassChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select Class</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} ({cls.code})
            </option>
          ))}
        </select>
      </div>

      {showSection && selectedClass && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Section <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedSection}
            onChange={handleSectionChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Section</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                Section {section.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
