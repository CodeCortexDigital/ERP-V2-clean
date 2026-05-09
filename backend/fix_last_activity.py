import psycopg2
from datetime import datetime

def fix_last_activity():
    try:
        conn = psycopg2.connect(
            dbname='postgres',
            user='postgres',
            password='Sundas_6921*',
            host='localhost',
            port='5432'
        )
        cursor = conn.cursor()
        
        # Update all students based on their latest attendance
        cursor.execute('''
            UPDATE education_students_student s
            SET last_activity = (
                SELECT MAX(a.date) 
                FROM education_attendance_attendancerecord a 
                WHERE a.student_id = s.id
            )
            WHERE EXISTS (
                SELECT 1 FROM education_attendance_attendancerecord a 
                WHERE a.student_id = s.id
            )
        ''')
        
        conn.commit()
        print(f'✅ Updated students based on latest attendance')
        
        # Force update Omar Butt to current time
        now = datetime.now()
        cursor.execute("UPDATE education_students_student SET last_activity = %s WHERE student_id = 'STU-2026-0001'", (now,))
        conn.commit()
        print(f'✅ Updated Omar Butt to current time: {now}')
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f'Error: {e}')
        return False

if __name__ == '__main__':
    fix_last_activity()
