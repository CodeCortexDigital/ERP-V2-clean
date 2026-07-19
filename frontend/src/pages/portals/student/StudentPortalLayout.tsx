import { Outlet } from 'react-router-dom';
import AiAssistant from '@/components/AiAssistant';

export default function StudentPortalLayout() {
  return (
    <>
      <Outlet />
      <AiAssistant mode="student" />
    </>
  );
}
