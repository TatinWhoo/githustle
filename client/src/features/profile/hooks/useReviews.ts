import { useQuery } from '@tanstack/react-query';
import { fixtureStore } from '@/lib/fixtures/fixtureLoader';
import { queryKeys } from '@/lib/query/keys';

export function useReviewsForUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.reviews.byUser(userId),
    queryFn: async () => fixtureStore.getReviews().filter((r) => r.subjectId === userId),
    enabled: !!userId,
  });
}
