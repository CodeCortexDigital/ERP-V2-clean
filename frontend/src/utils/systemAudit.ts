// frontend/src/utils/systemAudit.ts
// Run this in browser console to audit your ERP system

export interface AuditResult {
  module: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  data?: any;
  error?: string;
  time: number; // response time in ms
}

export interface SystemAuditReport {
  timestamp: string;
  totalModules: number;
  passed: number;
  failed: number;
  warnings: number;
  results: AuditResult[];
  summary: string;
}

class SystemAuditor {
  private baseUrl: string;
  private token: string | null;
  private results: AuditResult[] = [];

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/auth';
    this.token = localStorage.getItem('access_token');
  }

  private async testEndpoint(
    module: string, 
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET',
    data?: any
  ): Promise<AuditResult> {
    const startTime = performance.now();
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.status === 401) {
        return {
          module,
          status: 'FAIL',
          message: 'Authentication required - Please login first',
          error: '401 Unauthorized',
          time: responseTime
        };
      }

      if (response.status === 403) {
        return {
          module,
          status: 'WARNING',
          message: 'Permission denied - Check user role permissions',
          error: '403 Forbidden',
          time: responseTime
        };
      }

      if (!response.ok) {
        return {
          module,
          status: 'FAIL',
          message: `HTTP ${response.status}: ${response.statusText}`,
          error: await response.text().catch(() => 'No error details'),
          time: responseTime
        };
      }

      const result = await response.json();
      return {
        module,
        status: 'PASS',
        message: `Success (${responseTime}ms)`,
        data: result,
        time: responseTime
      };

    } catch (error: any) {
      const endTime = performance.now();
      return {
        module,
        status: 'FAIL',
        message: 'Network error - Backend may not be running',
        error: error.message || 'Unknown error',
        time: Math.round(endTime - startTime)
      };
    }
  }

  private async testStudents(): Promise<AuditResult> {
    return this.testEndpoint('Students', '/students/');
  }

  private async testStudentDetail(): Promise<AuditResult> {
    try {
      const response = await fetch(`${this.baseUrl}/students/`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await response.json();
      const students = data.results || data || [];
      
      if (students.length === 0) {
        return {
          module: 'Student Detail',
          status: 'WARNING',
          message: 'No students found to test detail view',
          time: 0
        };
      }

      const studentId = students[0]?.id || students[0]?.student_id;
      return this.testEndpoint('Student Detail', `/students/${studentId}/`);
    } catch (error: any) {
      return {
        module: 'Student Detail',
        status: 'FAIL',
        message: 'Failed to get student list',
        error: error.message,
        time: 0
      };
    }
  }

  private async testTeachers(): Promise<AuditResult> {
    return this.testEndpoint('Teachers', '/teachers/');
  }

  private async testClasses(): Promise<AuditResult> {
    return this.testEndpoint('Classes', '/classes/');
  }

  private async testClassDetail(): Promise<AuditResult> {
    try {
      const response = await fetch(`${this.baseUrl}/classes/`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await response.json();
      const classes = data.results || data || [];
      
      if (classes.length === 0) {
        return {
          module: 'Class Detail',
          status: 'WARNING',
          message: 'No classes found to test detail view',
          time: 0
        };
      }

      const classId = classes[0]?.id;
      return this.testEndpoint('Class Detail', `/classes/${classId}/`);
    } catch (error: any) {
      return {
        module: 'Class Detail',
        status: 'FAIL',
        message: 'Failed to get class list',
        error: error.message,
        time: 0
      };
    }
  }

  private async testSubjects(): Promise<AuditResult> {
    return this.testEndpoint('Subjects', '/subjects/');
  }

  private async testTimetables(): Promise<AuditResult> {
    return this.testEndpoint('Timetables', '/timetables/');
  }

  private async testPeriods(): Promise<AuditResult> {
    return this.testEndpoint('Periods', '/periods/');
  }

  private async testSections(): Promise<AuditResult> {
    return this.testEndpoint('Sections', '/sections/');
  }

  // ✅ FIXED: Test attendance with student_id parameter
  private async testAttendance(): Promise<AuditResult> {
    try {
      // First, get a student ID
      const response = await fetch(`${this.baseUrl}/students/`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await response.json();
      const students = data.results || data || [];
      
      if (students.length === 0) {
        return {
          module: 'Attendance',
          status: 'WARNING',
          message: 'No students found to test attendance',
          time: 0
        };
      }
      
      const studentId = students[0]?.id || students[0]?.student_id;
      // Test with student_id parameter
      return this.testEndpoint('Attendance', `/attendance/?student_id=${studentId}`);
    } catch (error: any) {
      return {
        module: 'Attendance',
        status: 'FAIL',
        message: 'Failed to get student for attendance test',
        error: error.message,
        time: 0
      };
    }
  }

  private async testExams(): Promise<AuditResult> {
    return this.testEndpoint('Exams', '/exams/');
  }

  private async testFinance(): Promise<AuditResult> {
    return this.testEndpoint('Finance', '/finance/invoices/');
  }

  private async testParentData(): Promise<AuditResult> {
    return this.testEndpoint('Parents', '/parents/');
  }

  private async testAdmissions(): Promise<AuditResult> {
    return this.testEndpoint('Admissions', '/admissions/');
  }

  private async testStaff(): Promise<AuditResult> {
    return this.testEndpoint('Staff', '/staff/');
  }

  private async testDashboardStats(): Promise<AuditResult> {
    return this.testEndpoint('Dashboard', '/dashboard/stats/');
  }

  private async testProfile(): Promise<AuditResult> {
    return this.testEndpoint('Profile', '/profile/');
  }

  public async runFullAudit(): Promise<SystemAuditReport> {
    console.log('🚀 Starting System Audit...\n');
    
    if (!this.token) {
      console.error('❌ No authentication token found!');
      console.log('Please login first and then run this audit again.');
      return {
        timestamp: new Date().toISOString(),
        totalModules: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        results: [],
        summary: '❌ FAILED: No authentication token found. Please login first.'
      };
    }

    console.log('✅ Token found, running tests...\n');

    const tests = [
      { name: 'Students', fn: () => this.testStudents() },
      { name: 'Student Detail', fn: () => this.testStudentDetail() },
      { name: 'Teachers', fn: () => this.testTeachers() },
      { name: 'Classes', fn: () => this.testClasses() },
      { name: 'Class Detail', fn: () => this.testClassDetail() },
      { name: 'Sections', fn: () => this.testSections() },
      { name: 'Subjects', fn: () => this.testSubjects() },
      { name: 'Timetables', fn: () => this.testTimetables() },
      { name: 'Periods', fn: () => this.testPeriods() },
      { name: 'Attendance', fn: () => this.testAttendance() },
      { name: 'Exams', fn: () => this.testExams() },
      { name: 'Finance', fn: () => this.testFinance() },
      { name: 'Parents', fn: () => this.testParentData() },
      { name: 'Admissions', fn: () => this.testAdmissions() },
      { name: 'Staff', fn: () => this.testStaff() },
      { name: 'Dashboard', fn: () => this.testDashboardStats() },
      { name: 'Profile', fn: () => this.testProfile() },
    ];

    for (const test of tests) {
      try {
        console.log(`🔄 Testing ${test.name}...`);
        const result = await test.fn();
        this.results.push(result);
        
        const icon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
        console.log(`  ${icon} ${test.name}: ${result.message}`);
      } catch (error: any) {
        this.results.push({
          module: test.name,
          status: 'FAIL',
          message: 'Unexpected error',
          error: error.message,
          time: 0
        });
        console.log(`  ❌ ${test.name}: Unexpected error - ${error.message}`);
      }
    }

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;

    const report: SystemAuditReport = {
      timestamp: new Date().toISOString(),
      totalModules: this.results.length,
      passed,
      failed,
      warnings,
      results: this.results,
      summary: this.generateSummary(passed, failed, warnings)
    };

    this.displayReport(report);
    return report;
  }

  private generateSummary(passed: number, failed: number, warnings: number): string {
    const total = passed + failed + warnings;
    const passRate = Math.round((passed / total) * 100);
    
    let status = '';
    if (passRate === 100) status = '✅ EXCELLENT - All systems operational!';
    else if (passRate >= 80) status = '⚠️ GOOD - Some modules need attention';
    else if (passRate >= 60) status = '🔴 NEEDS WORK - Several modules failing';
    else status = '🔴 CRITICAL - System is not functional';

    return `${status}\nPass Rate: ${passRate}% (${passed}/${total} modules)`;
  }

  private displayReport(report: SystemAuditReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYSTEM AUDIT REPORT');
    console.log('='.repeat(60));
    console.log(`📅 Timestamp: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`📈 Pass Rate: ${Math.round((report.passed / report.totalModules) * 100)}%`);
    console.log(`✅ Passed: ${report.passed}`);
    console.log(`❌ Failed: ${report.failed}`);
    console.log(`⚠️ Warnings: ${report.warnings}`);
    console.log(`📦 Total Modules: ${report.totalModules}`);
    console.log('\n' + '='.repeat(60));
    console.log('📋 DETAILED RESULTS');
    console.log('='.repeat(60));

    const passedResults = report.results.filter(r => r.status === 'PASS');
    const warningResults = report.results.filter(r => r.status === 'WARNING');
    const failedResults = report.results.filter(r => r.status === 'FAIL');

    if (passedResults.length > 0) {
      console.log('\n✅ PASSED:');
      passedResults.forEach(r => {
        console.log(`  - ${r.module}: ${r.message} (${r.time}ms)`);
      });
    }

    if (warningResults.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      warningResults.forEach(r => {
        console.log(`  - ${r.module}: ${r.message}`);
        if (r.error) console.log(`    Error: ${r.error}`);
      });
    }

    if (failedResults.length > 0) {
      console.log('\n❌ FAILED:');
      failedResults.forEach(r => {
        console.log(`  - ${r.module}: ${r.message}`);
        if (r.error) console.log(`    Error: ${r.error}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log(report.summary);
    console.log('='.repeat(60));
  }
}

// Export for use in browser console
export const runSystemAudit = async (): Promise<SystemAuditReport> => {
  const auditor = new SystemAuditor();
  return await auditor.runFullAudit();
};

// Also attach to window for console usage
if (typeof window !== 'undefined') {
  (window as any).runSystemAudit = runSystemAudit;
  console.log('🔧 System Audit tool loaded!');
  console.log('📋 Run: await runSystemAudit()');
}

export default SystemAuditor;