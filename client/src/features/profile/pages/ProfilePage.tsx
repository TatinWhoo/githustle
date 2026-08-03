import { useState } from 'react';
import { PageHeader } from '@/components/primitives/PageHeader';
import { PageShellSection } from '@/components/primitives/PageShellSection';
import { LoadingSkeleton } from '@/components/primitives/LoadingSkeleton';
import { IdentityCard } from '../components/IdentityCard';
import { BadgesRow } from '../components/BadgesRow';
import { ServicesList } from '../components/ServicesList';
import { ReviewsPanel } from '../components/ReviewsPanel';
import { ProfileEditDrawer } from '../components/ProfileEditDrawer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useServices } from '../hooks/useMyProfile';
import { useReviewsForUser } from '../hooks/useReviews';

export function ProfilePage() {
  const { user, role } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const { data: services = [] } = useServices();
  const { data: reviews = [], isLoading } = useReviewsForUser(user?.id ?? '');

  if (!user) return null;
  return (
    <PageShellSection>
      <PageHeader title="Profile" />
      <div className="flex flex-col gap-4">
        <IdentityCard user={user} onEdit={() => setEditOpen(true)} />
        <BadgesRow />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div>
            {role === 'freelancer' && <ServicesList services={services} />}
            {isLoading ? <LoadingSkeleton variant="row" count={3} /> : <ReviewsPanel reviews={reviews} />}
          </div>
          <aside />
        </div>
      </div>
      <ProfileEditDrawer isOpen={editOpen} user={user} onClose={() => setEditOpen(false)} />
    </PageShellSection>
  );
}
export default ProfilePage;
