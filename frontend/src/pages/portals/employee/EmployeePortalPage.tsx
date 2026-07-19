import React from 'react';
import { EmployeePortalProvider } from '@/contexts/EmployeePortalContext';
import EmployeePortal from '@/components/employee/EmployeePortal';

const EmployeePortalPage: React.FC = () => {
  return (
    <EmployeePortalProvider>
      <EmployeePortal />
    </EmployeePortalProvider>
  );
};

export default EmployeePortalPage;
