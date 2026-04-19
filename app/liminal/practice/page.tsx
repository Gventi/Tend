import { PracticeClient } from './PracticeClient';

export default function LiminalPracticePage({
  searchParams,
}: {
  searchParams: { carrying?: string };
}) {
  return <PracticeClient carrying={searchParams.carrying ?? ''} />;
}
