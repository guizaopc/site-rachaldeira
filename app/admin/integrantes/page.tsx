'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Plus, Upload } from 'lucide-react';

export default function AdminIntegrantesPage() {
    const router = useRouter();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        phone: '',
        email: '',
        position: '',
        password: '',
        is_active: true,
    });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState('');

    useEffect(() => {
        checkUser();
        loadMembers();
    }, []);

    const checkUser = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
            setCurrentUserEmail(user.email);
        }
    };

    const loadMembers = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error loading members:', error);
            setError(error.message);
        }

        setMembers(data || []);
        setLoading(false);
    };

    const handleOpenModal = (member?: any) => {
        if (member) {
            setEditingMember(member);
            setFormData({
                name: member.name,
                age: member.age?.toString() || '',
                phone: member.phone || '',
                email: member.email,
                position: member.position || '',
                password: '',
                is_active: member.is_active !== false,
            });
        } else {
            setEditingMember(null);
            setFormData({
                name: '',
                age: '',
                phone: '',
                email: '',
                position: '',
                password: '',
                is_active: true,
            });
        }
        setPhotoFile(null);
        setError('');
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setError('');
        setSaving(true);

        try {
            const supabase = createClient();
            let photoUrl = editingMember?.photo_url;

            // Upload foto se houver
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('photos')
                    .upload(fileName, photoFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('photos')
                    .getPublicUrl(fileName);

                photoUrl = publicUrl;
            }

            const memberData = {
                name: formData.name,
                age: formData.age ? parseInt(formData.age) : null,
                phone: formData.phone || null,
                email: formData.email,
                position: formData.position || null,
                photo_url: photoUrl,
                is_active: formData.is_active,
            };

            if (editingMember) {
                // Update
                const { error: updateError } = await supabase
                    .from('members')
                    .update(memberData)
                    .eq('id', editingMember.id);

                if (updateError) throw updateError;
            } else {
                // Insert
                const { data: newMember, error: insertError } = await supabase
                    .from('members')
                    .insert(memberData)
                    .select()
                    .single();

                if (insertError) throw insertError;

                // Criar usuário se tiver senha
                if (formData.password) {
                    const { data: { session } } = await supabase.auth.getSession();

                    const response = await fetch('/api/admin/create-user', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`,
                        },
                        body: JSON.stringify({
                            email: formData.email,
                            password: formData.password,
                            member_id: newMember.id,
                        }),
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error || 'Erro ao criar usuário');
                    }
                }
            }

            setIsModalOpen(false);
            loadMembers();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este integrante?')) return;

        const supabase = createClient();
        const { error } = await supabase
            .from('members')
            .delete()
            .eq('id', id);

        if (!error) {
            loadMembers();
        }
    };

    const handleRoleUpdate = async (memberId: string, newRole: string) => {
        try {
            const supabase = createClient();
            const { error } = await supabase.rpc('update_member_role', {
                target_member_id: memberId,
                new_role: newRole
            });

            if (error) throw error;

            // Atualizar lista para refletir mudança
            loadMembers();
            alert('Permissão atualizada com sucesso!');
        } catch (err: any) {
            console.error(err);
            alert('Erro ao atualizar permissão: ' + err.message);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">
                        Gerenciar Integrantes
                    </h1>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus size={20} className="mr-2" />
                        Novo Integrante
                    </Button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>E-mail</TableHead>
                                    <TableHead>Posição</TableHead>
                                    <TableHead>Idade</TableHead>
                                    <TableHead>Status</TableHead>
                                    {currentUserEmail === 'gr96445@gmail.com' && <TableHead>Função</TableHead>}
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.name}</TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>{member.position || '-'}</TableCell>
                                        <TableCell>{member.age || '-'}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${member.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {member.is_active !== false ? 'Ativo' : 'Não Membro'}
                                            </span>
                                        </TableCell>
                                        {currentUserEmail === 'gr96445@gmail.com' && (
                                            <TableCell>
                                                <Select
                                                    defaultValue={member.profiles?.[0]?.role || 'user'}
                                                    onValueChange={(value) => handleRoleUpdate(member.id, value)}
                                                >
                                                    <SelectTrigger className="w-[110px] h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">Membro</SelectItem>
                                                        <SelectItem value="director">Diretor</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenModal(member)}
                                            >
                                                <Pencil size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(member.id)}
                                            >
                                                <Trash2 size={16} className="text-red-600" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Modal */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingMember ? 'Editar Integrante' : 'Novo Integrante'}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                disabled={!!editingMember}
                            />
                        </div>
                        {!editingMember && (
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha *</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Senha para o usuário"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="position">Posição</Label>
                            <Select
                                value={formData.position}
                                onValueChange={(value) => setFormData({ ...formData, position: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a posição" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Goleiro">Goleiro</SelectItem>
                                    <SelectItem value="Zagueiro">Zagueiro</SelectItem>
                                    <SelectItem value="Lateral">Lateral</SelectItem>
                                    <SelectItem value="Meio-Campo">Meio-Campo</SelectItem>
                                    <SelectItem value="Atacante">Atacante</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status no Grupo</Label>
                            <Select
                                value={formData.is_active ? "true" : "false"}
                                onValueChange={(value) => setFormData({ ...formData, is_active: value === "true" })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Ativo (Aparece na lista)</SelectItem>
                                    <SelectItem value="false">Não Membro (Oculto)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="age">Idade</Label>
                                <Input
                                    id="age"
                                    type="number"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Foto</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                                className="cursor-pointer"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}
                    </div>
                </Modal>
            </div>
        </main>
    );
}
