from pathlib import Path

FILE = Path(
    r"frontend/src/pages/attendance/AttendancePage.tsx"
)

content = FILE.read_text(encoding="utf-8")


# --------------------------------------
# Fix 1: matchAttendanceRecord
# --------------------------------------
old_match = """function matchAttendanceRecord(records: any[], student: { id: string; student_id?: string }) {
  const sid = String(student.id);
  const roll = student.student_id ? String(student.student_id) : '';
  return records.find((a) => {
    const aid = a.student_id != null ? String(a.student_id) : '';
    return aid === sid || (roll && aid === roll);
  });
}"""

new_match = """function matchAttendanceRecord(
  records: any[],
  student: { id: string; student_id?: string }
) {
  const studentUUID = String(student.id);
  const studentRoll = student.student_id
    ? String(student.student_id)
    : '';

  return records.find((record) => {
    const recordStudentId = String(
      record.student_id ||
      record.student ||
      record.student_ref ||
      ''
    );

    return (
      recordStudentId === studentUUID ||
      recordStudentId === studentRoll
    );
  });
}"""

content = content.replace(old_match, new_match)


# --------------------------------------
# Fix 2: teacherMarked
# --------------------------------------
old_teacher = """const teacherMarked = Boolean(existing?.marked_by_id || existing?.marked_by_name);"""

new_teacher = """const teacherMarked = Boolean(
          existing?.marked_by_id ||
          existing?.marked_by_name ||
          existing?.marked_by
        );"""

content = content.replace(old_teacher, new_teacher)


FILE.write_text(content, encoding="utf-8")

print("SUCCESS: Attendance UI auto-fixed.")