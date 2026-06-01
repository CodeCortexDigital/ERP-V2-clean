import os
import psycopg2

def remove_all_triggers():
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
        
        # Drop all triggers on attendance table
        cursor.execute('DROP TRIGGER IF EXISTS update_last_activity_trigger ON education_attendance_attendancerecord;')
        cursor.execute('DROP TRIGGER IF EXISTS attendance_activity_trigger ON education_attendance_attendancerecord;')
        cursor.execute('DROP TRIGGER IF EXISTS trigger_update_last_activity ON education_attendance_attendancerecord;')
        
        # Drop all triggers on student table
        cursor.execute('DROP TRIGGER IF EXISTS profile_edit_trigger ON education_students_student;')
        cursor.execute('DROP TRIGGER IF EXISTS profile_activity_trigger ON education_students_student;')
        cursor.execute('DROP TRIGGER IF EXISTS trigger_profile_update ON education_students_student;')
        
        # Drop all trigger functions
        cursor.execute('DROP FUNCTION IF EXISTS update_last_activity_on_attendance() CASCADE;')
        cursor.execute('DROP FUNCTION IF EXISTS update_last_activity_on_profile() CASCADE;')
        cursor.execute('DROP FUNCTION IF EXISTS update_last_activity_on_exam() CASCADE;')
        cursor.execute('DROP FUNCTION IF EXISTS update_last_activity_on_payment() CASCADE;')
        cursor.execute('DROP FUNCTION IF EXISTS update_student_last_activity() CASCADE;')
        cursor.execute('DROP FUNCTION IF EXISTS update_last_activity_function() CASCADE;')
        
        conn.commit()
        print('✅ ALL TRIGGERS REMOVED SUCCESSFULLY!')
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f'Error: {e}')
        return False

if __name__ == '__main__':
    remove_all_triggers()
