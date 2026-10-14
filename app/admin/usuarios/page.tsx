import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertCircle, UserCheck, UserPlus, UserX, UserMinus } from 'lucide-react';
import { linkUserToMember, deleteUserAndProfile } from './actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';

export default async function AdminUsuariosPage() {
    // 1. Apenas admins (não confiar só no middleware: esta página usa a service role)
    const auth = await requireRole(['admin']);
    if (auth.error) redirect('/');

    const supabase = createAdminClient();

    // 2. Fetch all members
    const { data: members } = await supabase
        .from('members')
        .select('id, name, email')
        .order('name');

    // 3. Fetch all profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

    // 4. Fetch all Auth users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        return <div>Erro ao carregar usuários: {authError.message}</div>;
    }

    // Combine data
    const combinedUsers = users.map(user => {
        const profile = profiles?.find(p => p.id === user.id);
        const member = members?.find(m => m.id === profile?.member_id);
        
        return {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || 'Sem nome',
            role: profile?.role || 'user',
            memberId: profile?.member_id,
            memberName: member?.name,
            lastLogin: user.last_sign_in_at
        };
    }).sort((a, b) => (a.email || '').localeCompare(b.email || ''));

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Usuários</h1>
                        <p className="text-gray-600">Vincule contas de e-mail aos perfis de jogadores.</p>
                    </div>
                    <Link href="/admin">
                        <Button variant="outline">Voltar ao Painel</Button>
                    </Link>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 flex items-start gap-3">
                    <AlertCircle className="text-blue-600 flex-shrink-0" size={24} />
                    <div>
                        <p className="font-semibold text-blue-800 mb-1">Dica para resolver bugs de confirmação</p>
                        <p className="text-sm text-blue-700">
                            Se um usuário diz que não consegue confirmar presença, verifique se a coluna <strong>"Vínculo com Jogador"</strong> está preenchida. Se estiver vazia ou errada, use o botão de vincular.
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Usuários ({combinedUsers.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>E-mail / Usuário</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Vínculo com Jogador</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {combinedUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="font-medium">{user.email}</div>
                                            <div className="text-xs text-gray-500">{user.name}</div>
                                            <div className="text-[10px] text-gray-400">ID: {user.id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {user.role.toUpperCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {user.memberName ? (
                                                <div className="flex items-center gap-2 text-green-700 font-medium">
                                                    <UserCheck size={16} />
                                                    {user.memberName}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-500 italic">
                                                    <UserMinus size={16} />
                                                    Não vinculado
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <UserFixDialog 
                                                    user={user} 
                                                    members={members || []} 
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

// Client component for the dialog (simplified for this context)
function UserFixDialog({ user, members }: { user: any, members: any[] }) {
    return (
        <form action={async (formData: FormData) => {
            'use server';
            const memberId = formData.get('memberId') as string;
            await linkUserToMember(user.id, memberId === 'none' ? null : memberId);
        }} className="flex items-center gap-2">
            <select 
                name="memberId" 
                defaultValue={user.memberId || 'none'}
                className="text-sm border rounded px-2 py-1 bg-white"
            >
                <option value="none">-- Sem Vínculo --</option>
                {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
            </select>
            <Button type="submit" size="sm" variant="secondary" className="gap-1">
                <UserPlus size={14} />
                Vincular
            </Button>
        </form>
    );
}
