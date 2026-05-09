import { Calendar, Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
export default function TimetableGenerator() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Timetable Generator</h1>
      <div className="grid grid-cols-7 gap-1 mt-4 text-center">
        <div className="font-bold p-2">Mon</div>
        <div className="font-bold p-2">Tue</div>
        <div className="font-bold p-2">Wed</div>
        <div className="font-bold p-2">Thu</div>
        <div className="font-bold p-2">Fri</div>
        <div className="font-bold p-2">Sat</div>
        <div className="font-bold p-2">Sun</div>
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2 text-center relative min-h-[400px]">
        {Array.from({ length: 7 }, (_, idx) => (
          <div key={idx} className="border p-2 text-sm text-gray-400">No classes</div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline"><Download className="w-4 h-4" /> Export</Button>
        <Button variant="outline"><Printer className="w-4 h-4" /> Print</Button>
        <Button>Generate Timetable</Button>
      </div>
    </div>
  )
}

