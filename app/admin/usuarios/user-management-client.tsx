'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Profile {
    id: string; // auth_id
    role: 'admin' | 'director' | 'user';
    created_at: string;
    members: {
        id: string;
        name: string;
        email: string;
        photo_url: string | null;
        position: string;
        level: number;
    };
}

export default function UserManagementClient({ profiles }: { profiles: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState<string | null>(null); // profile id being updated
    const [userProfiles, setUserProfiles] = useState<Profile[]>(profiles);

    const filteredProfiles = userProfiles.filter(p =>
        p.members?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.members?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRoleUpdate = async (profileId: string, newRole: 'admin' | 'director' | 'user') => {
        setLoading(profileId);
        const supabase = createClient();

        // Optimistically update
        setUserProfiles(prev => prev.map(p =>
            p.id === profileId ? { ...p, role: newRole } : p
        ));

        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', profileId);

        if (error) {
            alert('Erro ao atualizar permissão: ' + error.message);
            // Revert on error
            setUserProfiles(prev => prev.map(p =>
                p.id === profileId ? { ...p, role: profiles.find(orig => orig.id === profileId)?.role || 'user' } : p
            ));
        }
        setLoading(null);
    };

    const handleLevelUpdate = async (memberId: string, newLevel: number) => {
        setLoading(`${memberId}-level`);
        const supabase = createClient();

        console.log("Updating level for", memberId, "to", newLevel);

        const { error } = await supabase
            .from('members')
            .update({ level: newLevel })
            .eq('id', memberId);

        if (error) {
            console.error("Level update error:", error);
            alert('Erro ao atualizar nível: ' + error.message);
        } else {
            setUserProfiles(prev => prev.map(p =>
                p.members?.id === memberId
                    ? { ...p, members: { ...p.members, level: newLevel } }
                    : p
            ));
        }
        setLoading(null);
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <Badge className="bg-red-600 hover:bg-red-700">Admin</Badge>;
            case 'director':
                return <Badge className="bg-purple-600 hover:bg-purple-700">Diretor</Badge>;
            default:
                return <Badge variant="secondary">Usuário</Badge>;
        }
    };

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Posição</TableHead>
                                <TableHead>Nível</TableHead>
                                <TableHead>Cargo Atual</TableHead>
                                <TableHead className="text-right">Definir Cargo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProfiles.length > 0 ? (
                                filteredProfiles.map((p) => (
                                    <TableRow key={p.id} className={!p.members ? "bg-red-50/50" : ""}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={p.members?.photo_url || ''} />
                                                    <AvatarFallback>{p.members?.name?.charAt(0) || '?'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className={`text-sm font-medium leading-none ${!p.members ? "text-red-600 font-bold" : ""}`}>
                                                        {p.members?.name || "SEM REGISTRO DE MEMBRO"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {p.members ? `ID: ${p.members.id.slice(0, 8)}...` : `Auth ID: ${p.id.slice(0, 8)}...`}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{p.members?.email || "N/A"}</TableCell>
                                        <TableCell>{p.members?.position || "-"}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={String(p.members?.level || 1)}
                                                onValueChange={(val) => p.members && handleLevelUpdate(p.members.id, parseInt(val))}
                                                disabled={!p.members || loading === `${p.members?.id}-level`}
                                            >
                                                <SelectTrigger className="w-[70px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[1, 2, 3, 4, 5].map(level => (
                                                        <SelectItem key={level} value={String(level)}>
                                                            {level}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>{getRoleBadge(p.role)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <Select
                                                    value={p.role}
                                                    onValueChange={(val: 'admin' | 'director' | 'user') => handleRoleUpdate(p.id, val)}
                                                    disabled={loading === p.id}
                                                >
                                                    <SelectTrigger className="w-[130px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">Usuário</SelectItem>
                                                        <SelectItem value="director">Diretor</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Nenhum usuário encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
