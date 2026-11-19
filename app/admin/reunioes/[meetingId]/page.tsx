import { loadBoardMembers } from '../load-members';
import MeetingDetailClient from './meeting-detail-client';

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({ params }: { params: Promise<{ meetingId: string }> }) {
    const { meetingId } = await params;
    const members = await loadBoardMembers();
    return <MeetingDetailClient meetingId={meetingId} members={members} />;
}
