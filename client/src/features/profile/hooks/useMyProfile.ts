import { useQuery } from '@tanstack/react-query';
import { fixtureStore } from '@/lib/fixtures/fixtureLoader';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useServices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.services.byFreelancer(user?.id ?? ''),
    queryFn: async () => fixtureStore.getServices(user?.id),
    enabled: !!user,
  });
}
