import React from 'react';
import { useEmployeePortal } from '@/contexts/EmployeePortalContext';

interface PermissionGateProps {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  module,
  action,
  children,
  fallback = null,
}) => {
  const { canAccessModule } = useEmployeePortal();

  if (canAccessModule(module, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default PermissionGate;
