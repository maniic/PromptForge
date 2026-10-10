import ChallengeWorkspace from '@/components/academy/ChallengeWorkspace';

export default function ChallengePage({ params }: { params: { id: string } }) {
  return <ChallengeWorkspace challengeId={params.id} />;
}
