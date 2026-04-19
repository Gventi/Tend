import { SessionClient } from './SessionClient';

export default function SessionPage({
  searchParams,
}: {
  searchParams: { target?: string; presence?: string };
}) {
  return (
    <SessionClient
      target={searchParams.target ?? 'self'}
      presence={searchParams.presence ?? ''}
    />
  );
}
