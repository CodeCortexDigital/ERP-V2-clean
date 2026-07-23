import { useSearchParams } from 'react-router-dom';
import RateBehavioursPage from './RateBehavioursPage';
import RateSkillsPage from './RateSkillsPage';
import ObservationsPage from './ObservationsPage';
import AffectiveDomainReportPage from './AffectiveDomainReportPage';
import PsycomotorDomainReportPage from './PsycomotorDomainReportPage';

export default function BehaviourPage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'rate-behaviour';

  switch (tab) {
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
