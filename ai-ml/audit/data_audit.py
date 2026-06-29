import sys
import os
import django

# Configure stdout for UTF-8 to avoid Unicode encoding issues in Windows command prompt
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Setup Django path relative to this script
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.abspath(os.path.join(current_dir, '..', '..', 'backend'))
if os.name == 'nt' and len(backend_path) > 1 and backend_path[1] == ':':
    backend_path = backend_path[0].upper() + backend_path[1:]

sys.path.append(backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')

try:
    django.setup()
except Exception as e:
    print(f"❌ Django Setup Failed: {e}")
    print("Please verify database connectivity using python ai-ml/setup/verify_infra.py")
    sys.exit(1)

from django.apps import apps

def main():
    print("=" * 60)
    print("📊 AI/ML TRAINING DATA READINESS AUDIT")
    print("=" * 60)

    # Dictionary of (app_label, model_name, display_name, target_threshold)
    models_to_check = [
        ('education_students', 'Student', 'Students', 20),
        ('education_academics', 'Teacher', 'Teachers', 5),
        ('education_academics', 'SchoolClass', 'School Classes', 5),
        ('education_attendance', 'AttendanceRecord', 'Attendance Records', 1000),
        ('education_exams', 'ExamResult', 'Exam Results', 500),
        ('education_finance', 'Invoice', 'Invoices', 200),
        ('education_academics', 'LessonPlan', 'Lesson Plans', 50),
        ('education_academics', 'SyllabusTopic', 'Syllabus Topics', 50),
        ('education_academics', 'StudentTopicProgress', 'Student Topic Progress', 500),
    ]

    print(f"{'Data Metric':<25} | {'Count':<8} | {'Target':<8} | {'Readiness Status'}")
    print("-" * 60)

    ready_count = 0
    total_metrics = len(models_to_check)
    report_lines = []

    for app_label, model_name, display_name, target in models_to_check:
        error_msg = ""
        try:
            model = apps.get_model(app_label, model_name)
            count = model.objects.count()
        except LookupError:
            count = "N/A"
            error_msg = "Model not found"
        except Exception as e:
            count = "Error"
            error_msg = str(e)

        if isinstance(count, int):
            percentage = min(100, int((count / target) * 100))
            if count >= target:
                status = f"✅ READY ({percentage}%)"
                ready_count += 1
            else:
                status = f"⚠️ INSUFFICIENT ({percentage}%)"
            count_str = str(count)
        else:
            status = f"❌ FAILED ({error_msg})"
            count_str = "Error"
            percentage = 0

        line = f"{display_name:<25} | {count_str:<8} | {target:<8} | {status}"
        print(line)
        report_lines.append(line)

    readiness_score = int((ready_count / total_metrics) * 100)
    print("-" * 60)
    print(f"Overall AI Integration Readiness Score: {readiness_score}% ({ready_count}/{total_metrics} Modules Ready)")
    print("=" * 60)

    # Recommendations
    print("\n💡 READINESS RECOMMENDATIONS:")
    if readiness_score == 100:
        print("  🎉 Excellent! All required data thresholds are met. You are ready to train machine learning models.")
    else:
        print("  The following steps are recommended to prepare for model training:")
        for app_label, model_name, display_name, target in models_to_check:
            try:
                model = apps.get_model(app_label, model_name)
                count = model.objects.count()
                if count < target:
                    shortfall = target - count
                    print(f"  👉 Generate/collect {shortfall} more {display_name} (currently {count}/{target}).")
            except Exception:
                print(f"  👉 Verify and seed {display_name} model in your database.")
    
    # Save a copy of the audit report to file
    report_path = os.path.join(current_dir, 'audit_report.txt')
    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("=" * 60 + "\n")
            f.write("📊 AI/ML TRAINING DATA READINESS AUDIT\n")
            f.write("=" * 60 + "\n")
            for line in report_lines:
                f.write(line + "\n")
            f.write("-" * 60 + "\n")
            f.write(f"Overall AI Integration Readiness Score: {readiness_score}% ({ready_count}/{total_metrics} Modules Ready)\n")
            f.write("=" * 60 + "\n")
        print(f"\n📁 Report saved to: {report_path}")
    except Exception as e:
        print(f"\n⚠️ Could not save report file: {e}")

if __name__ == '__main__':
    main()
