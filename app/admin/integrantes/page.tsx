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
import { Pencil, Trash2, Plus, Users, AlertCircle, Search } from 'lucide-react';

export default function AdminIntegrantesPage() {
    const router = useRouter();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
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
        try {
            setError('');
            const supabase = createClient();

            // Querying members and optionally profiles if relationship exists
            // We use a simpler select first to avoid join errors if the relationship is ambiguous
            const { data, error: mError } = await supabase
                .from('members')
                .select('*, profiles(role)')
                .order('name');

            if (mError) {
                console.error('Error loading members with profiles:', mError);
                // Fallback to members only if join fails
                const { data: justMembers, error: fallbackError } = await supabase
                    .from('members')
                    .select('*')
                    .order('name');

                if (fallbackError) throw fallbackError;
                setMembers(justMembers || []);
            } else {
                setMembers(data || []);
            }
        } catch (err: any) {
            console.error('Final error:', err);
            setError('Erro ao carregar integrantes: ' + err.message);
        } finally {
            setLoading(false);
        }
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

            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('Fotos')
                    .upload(fileName, photoFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('Fotos')
                    .getPublicUrl(fileName);

                photoUrl = publicUrl;
            }

            const memberData: any = {
                name: formData.name,
                age: formData.age ? parseInt(formData.age) : null,
                phone: formData.phone || null,
                email: formData.email,
                position: formData.position || null,
                photo_url: photoUrl,
                is_active: formData.is_active,
            };

            if (editingMember) {
                const { error: updateError } = await supabase
                    .from('members')
                    .update(memberData)
                    .eq('id', editingMember.id);

                if (updateError) throw updateError;
            } else {
                const { data: newMember, error: insertError } = await supabase
                    .from('members')
                    .insert(memberData)
                    .select()
                    .single();

                if (insertError) throw insertError;

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

        if (error) {
            setError('Erro ao excluir: ' + error.message);
        } else {
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
            loadMembers();
            alert('Permissão atualizada com sucesso!');
        } catch (err: any) {
            console.error(err);
            alert('Erro ao atualizar permissão: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Carregando integrantes...</p>
            </div>
        );
    }

    const filteredMembers = members
        .filter(m => showInactive || m.is_active !== false)
        .filter(m =>
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.position?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 leading-tight">
                            Gerenciamento de Perebas
                        </h1>
                        <p className="text-gray-500 mt-1">Controle total do elenco do Rachaldeira</p>
                    </div>
                    <Button onClick={() => handleOpenModal()} className="bg-[#093a9f] hover:bg-[#072d7a]">
                        <Plus size={20} className="mr-2" />
                        Novo Integrante
                    </Button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="font-semibold">{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-white border-none shadow-sm overflow-hidden">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Ativos</p>
                                <p className="text-2xl font-black text-gray-900">{members.filter(m => m.is_active !== false).length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-none shadow-sm overflow-hidden">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Inativos</p>
                                <p className="text-2xl font-black text-gray-900">{members.filter(m => m.is_active === false).length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-none shadow-xl overflow-hidden rounded-2xl bg-white">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between py-6 gap-4">
                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                            <CardTitle className="text-lg font-bold">Lista de Integrantes</CardTitle>

                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar integrante..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 bg-white border-gray-200"
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={showInactive}
                                    onChange={(e) => setShowInactive(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-gray-600">Ver Inativos</span>
                            </label>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                            Mostrando {filteredMembers.length} de {members.length}
                        </p>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/30">
                                    <TableRow className="hover:bg-transparent border-gray-100">
                                        <TableHead className="w-16 text-center font-bold text-gray-400 uppercase text-[10px] tracking-widest">Foto</TableHead>
                                        <TableHead className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Nome</TableHead>
                                        <TableHead className="hidden md:table-cell font-bold text-gray-400 uppercase text-[10px] tracking-widest">Posição</TableHead>
                                        <TableHead className="hidden md:table-cell font-bold text-gray-400 uppercase text-[10px] tracking-widest text-center">Idade</TableHead>
                                        <TableHead className="font-bold text-gray-400 uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                                        {currentUserEmail === 'gr96445@gmail.com' && <TableHead className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Permissão</TableHead>}
                                        <TableHead className="text-right font-bold text-gray-400 uppercase text-[10px] tracking-widest pr-6">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMembers.map((member) => (
                                        <TableRow key={member.id} className={`hover:bg-gray-50/50 transition-colors border-gray-100 ${member.is_active === false ? 'bg-gray-50/50' : ''}`}>
                                            <TableCell className="text-center py-4">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-sm mx-auto">
                                                    {member.photo_url ? (
                                                        <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-xs">?</div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900">{member.name}</span>
                                                    <span className="text-xs text-gray-400 font-medium">{member.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                    {member.position || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-center font-medium text-gray-600">
                                                {member.age || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${member.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                                    }`}>
                                                    {member.is_active !== false ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </TableCell>
                                            {currentUserEmail === 'gr96445@gmail.com' && (
                                                <TableCell>
                                                    <Select
                                                        defaultValue={member.profiles?.[0]?.role || 'user'}
                                                        onValueChange={(value) => handleRoleUpdate(member.id, value)}
                                                    >
                                                        <SelectTrigger className="w-[110px] h-8 text-xs font-bold border-none bg-gray-50">
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
                                            <TableCell className="text-right pr-6 space-x-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenModal(member)}
                                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                    <Pencil size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(member.id)}
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredMembers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-gray-500 font-medium">
                                                {loading ? 'Carregando...' : 'Nenhum integrante encontrado.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingMember ? 'Editar Integrante' : 'Novo Integrante'}
                footer={
                    <div className="flex gap-3 justify-end w-full">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                            {saving ? 'Salvando...' : editingMember ? 'Salvar Alterações' : 'Criar Integrante'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nome do pereba"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="email@exemplo.com"
                                disabled={!!editingMember}
                            />
                        </div>
                    </div>

                    {!editingMember && (
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha Inicial *</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Mínimo 6 caracteres"
                            />
                            <p className="text-[10px] text-gray-400">O usuário poderá alterar a senha depois.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="position">Posição</Label>
                            <Select
                                value={formData.position}
                                onValueChange={(value) => setFormData({ ...formData, position: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Goleiro">Goleiro</SelectItem>
                                    <SelectItem value="Zagueiro">Zagueiro</SelectItem>
                                    <SelectItem value="Lateral">Lateral</SelectItem>
                                    <SelectItem value="Volante">Volante</SelectItem>
                                    <SelectItem value="Meia">Meia</SelectItem>
                                    <SelectItem value="Atacante">Atacante</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="age">Idade</Label>
                            <Input
                                id="age"
                                type="number"
                                value={formData.age}
                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            />
                        </div>
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
                                <SelectItem value="true">Membro Ativo</SelectItem>
                                <SelectItem value="false">Inativo / Ex-membro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Foto do Perfil</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                            className="cursor-pointer file:bg-blue-50 file:text-blue-700 file:border-none file:mr-4 file:px-3 file:py-1 file:rounded-md file:text-xs file:font-bold hover:bg-gray-50"
                        />
                        {photoFile && <p className="text-[10px] text-green-600 font-bold">Arquivo selecionado: {photoFile.name}</p>}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm font-medium">
                            {error}
                        </div>
                    )}
                </div>
            </Modal>
        </main>
    );
}
