import os
import psycopg2
from datetime import datetime

def fix_last_activity():
    try:
        dbname = os.environ.get('DB_NAME', 'postgres')
        dbuser = os.environ.get('DB_USER', 'postgres')
        dbpassword = os.environ.get('DB_PASSWORD')
        dbhost = os.environ.get('DB_HOST', 'localhost')
        dbport = os.environ.get('DB_PORT', '5432')

        if not dbpassword:
            raise EnvironmentError('DB_PASSWORD environment variable is required.')

        conn = psycopg2.connect(
            dbname=dbname,
            user=dbuser,
            password=dbpassword,
            host=dbhost,
            port=dbport
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
