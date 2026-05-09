import psycopg2

def remove_all_triggers():
    try:
        conn = psycopg2.connect(
            dbname='postgres',
            user='postgres',
            password='Sundas_6921*',
            host='localhost',
            port='5432'
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
