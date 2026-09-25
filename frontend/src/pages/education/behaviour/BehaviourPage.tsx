import { useSearchParams } from 'react-router-dom';
import RateBehavioursPage from './RateBehavioursPage';
import RateSkillsPage from './RateSkillsPage';
import ObservationsPage from './ObservationsPage';
import AffectiveDomainReportPage from './AffectiveDomainReportPage';
import PsycomotorDomainReportPage from './PsycomotorDomainReportPage';
import BehaviourLogPage from './BehaviourLogPage';
import BehaviourReportPage from './BehaviourReportPage';
import BehaviourSettingsPage from './BehaviourSettingsPage';

export default function BehaviourPage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'log';

  switch (tab) {
    case 'log':
      return <BehaviourLogPage />;
    case 'behaviour-report':
      return <BehaviourReportPage />;
    case 'behaviour-settings':
      return <BehaviourSettingsPage />;
    case 'rate-behaviour':
      return <RateBehavioursPage />;
    case 'rate-skills':
      return <RateSkillsPage />;
    case 'observations':
      return <ObservationsPage />;
    case 'affective-report':
      return <AffectiveDomainReportPage />;
    case 'psycomotor-report':
      return <PsycomotorDomainReportPage />;
    default:
      return <RateBehavioursPage />;
  }
}
