import { loadBoardMembers } from './load-members';
import ReunioesClient from './reunioes-client';

export const dynamic = 'force-dynamic';

export default async function ReunioesPage() {
    const members = await loadBoardMembers();
    return <ReunioesClient members={members} />;
}
