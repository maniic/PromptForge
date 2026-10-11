import RoadmapView from '@/components/academy/RoadmapView';

export default function RoadmapPage({ params }: { params: { id: string } }) {
  return <RoadmapView roadmapId={params.id} />;
}
