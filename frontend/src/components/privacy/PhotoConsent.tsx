import { useEffect, useState } from 'react';
import { CameraOff } from 'lucide-react';
import privacy from '@/services/privacy.service';

/** {student id: true | false | null} for the "photos and videos" consent (staff screens). */
export function usePhotoConsent(ids: string[]) {
  const [map, setMap] = useState<Record<string, boolean | null>>({});
  const key = ids.join(',');
  useEffect(() => {
    if (!ids.length) return;
    privacy.photoConsent(ids).then(setMap).catch(() => setMap({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return map;
}

/** Shown only when the family said no: staff must not use this child's photo. */
export function NoPhotoBadge({ consent }: { consent: boolean | null | undefined }) {
  if (consent !== false) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700" title="The family has not agreed to photos or videos">
      <CameraOff size={11} /> No photos
    </span>
  );
}
