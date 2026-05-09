import psycopg2
from datetime import date

def test_attendance():
    try:
        conn = psycopg2.connect(
            dbname='postgres',
            user='postgres',
            password='Sundas_6921*',
            host='localhost',
            port='5432'
        )
        cursor = conn.cursor()
        
        # Get Omar Butt's ID
        cursor.execute("SELECT id FROM education_students_student WHERE student_id = 'STU-2026-0001'")
        row = cursor.fetchone()
        
        if row:
            student_id = row[0]
            today = date.today()
            
            # Check if attendance exists
            cursor.execute("SELECT id FROM education_attendance_attendancerecord WHERE student_id = %s AND date = %s", (student_id, today))
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute("UPDATE education_attendance_attendancerecord SET status = 'present', updated_at = NOW() WHERE id = %s", (existing[0],))
                print(f'✅ Updated existing attendance for today')
            else:
                cursor.execute("""
                    INSERT INTO education_attendance_attendancerecord (id, student_id, date, status, created_at, updated_at)
                    VALUES (gen_random_uuid(), %s, %s, 'present', NOW(), NOW())
                """, (student_id, today))
                print(f'✅ Inserted new attendance for today')
            
            conn.commit()
            
            # Check if last_activity was updated
            cursor.execute("SELECT last_activity FROM education_students_student WHERE student_id = 'STU-2026-0001'")
            result = cursor.fetchone()
            print(f'📍 New last_activity: {result[0]}')
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    test_attendance()
