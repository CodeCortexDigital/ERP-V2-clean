import psycopg2

def create_trigger():
    try:
        conn = psycopg2.connect(
            dbname='postgres',
            user='postgres',
            password='Sundas_6921*',
            host='localhost',
            port='5432'
        )
        cursor = conn.cursor()
        
        # Create trigger function
        cursor.execute('''
            CREATE OR REPLACE FUNCTION update_last_activity_on_attendance()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE education_students_student 
                SET last_activity = NOW() 
                WHERE id = NEW.student_id;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        ''')
        
        # Drop old trigger
        cursor.execute('DROP TRIGGER IF EXISTS update_last_activity_trigger ON education_attendance_attendancerecord;')
        
        # Create new trigger
        cursor.execute('''
            CREATE TRIGGER update_last_activity_trigger
            AFTER INSERT OR UPDATE ON education_attendance_attendancerecord
            FOR EACH ROW
            EXECUTE FUNCTION update_last_activity_on_attendance();
        ''')
        
        conn.commit()
        print('✅ Database trigger created successfully!')
        print('   Last activity will now auto-update when attendance is marked')
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f'Error creating trigger: {e}')
        return False

if __name__ == '__main__':
    create_trigger()
