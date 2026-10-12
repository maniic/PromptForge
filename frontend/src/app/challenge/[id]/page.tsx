import ChallengeWorkspace from '@/components/academy/ChallengeWorkspace';

export default function ChallengePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { roadmap?: string };
}) {
  return <ChallengeWorkspace challengeId={params.id} roadmapId={searchParams.roadmap} />;
}
