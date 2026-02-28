'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pencil, Trash2, Plus } from 'lucide-react';

export default function AdminRachasPage() {
    const router = useRouter();
    const [rachas, setRachas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRacha, setEditingRacha] = useState<any>(null);
    const [formData, setFormData] = useState({
        date: '',
        time: '',
        location: '',
        periodicity: 'once',
        is_next: false,
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadRachas();
    }, []);

    const loadRachas = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('rachas')
            .select('*')
            .neq('location', 'Sistema (Manual)')
            .order('date_time', { ascending: false });

        setRachas(data || []);
        setLoading(false);
    };

    const handleOpenModal = (racha?: any) => {
        if (racha) {
            const dateTime = new Date(racha.date_time);
            setEditingRacha(racha);
            setFormData({
                date: dateTime.toISOString().split('T')[0],
                time: dateTime.toTimeString().slice(0, 5),
                location: racha.location,
                periodicity: racha.periodicity,
                is_next: racha.is_next,
            });
        } else {
            setEditingRacha(null);
            setFormData({
                date: '',
                time: '',
                location: '',
                periodicity: 'once',
                is_next: false,
            });
        }
        setError('');
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setError('');
        setSaving(true);

        try {
            const supabase = createClient();

            const dateTime = new Date(`${formData.date}T${formData.time}`).toISOString();

            const rachaData = {
                date_time: dateTime,
                location: formData.location,
                periodicity: formData.periodicity,
                is_next: formData.is_next,
                status: 'open',
            };

            // Se marcar como is_next, desmarcar outros
            if (formData.is_next) {
                await supabase
                    .from('rachas')
                    .update({ is_next: false })
                    .neq('id', editingRacha?.id || '00000000-0000-0000-0000-000000000000');
            }

            if (editingRacha) {
                // Update
                const { error: updateError } = await supabase
                    .from('rachas')
                    .update(rachaData)
                    .eq('id', editingRacha.id);

                if (updateError) throw updateError;
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('rachas')
                    .insert(rachaData);

                if (insertError) throw insertError;
            }

            setIsModalOpen(false);
            loadRachas();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este racha?')) return;

        const supabase = createClient();
        const { error } = await supabase
            .from('rachas')
            .delete()
            .eq('id', id);

        if (!error) {
            loadRachas();
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
                        Gerenciar Rachas
                    </h1>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus size={20} className="mr-2" />
                        Novo Racha
                    </Button>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data/Hora</TableHead>
                                    <TableHead>Local</TableHead>
                                    <TableHead>Periodicidade</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Próximo</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rachas.map((racha) => (
                                    <TableRow key={racha.id}>
                                        <TableCell className="font-medium">
                                            {new Date(racha.date_time).toLocaleString('pt-BR')}
                                        </TableCell>
                                        <TableCell>{racha.location}</TableCell>
                                        <TableCell>
                                            {racha.periodicity === 'weekly' ? '🔄 Semanal' :
                                                racha.periodicity === 'monthly' ? '🔄 Mensal' : 'Único'}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs rounded ${racha.status === 'open' ? 'bg-green-100 text-green-800' :
                                                racha.status === 'locked' ? 'bg-yellow-100 text-yellow-800' :
                                                    racha.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {racha.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>{racha.is_next ? '🔥 Sim' : '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/admin/rachas/${racha.id}/scouts`)}
                                                className="border-blue-200 text-blue-600 hover:bg-blue-50 font-bold"
                                            >
                                                Gerenciar Scouts de Hoje
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenModal(racha)}
                                            >
                                                <Pencil size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(racha.id)}
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
                    title={editingRacha ? 'Editar Racha' : 'Novo Racha'}
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Data *
                                </label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Hora *
                                </label>
                                <Input
                                    type="time"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Local *
                            </label>
                            <Input
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Ex: Campo do Parque"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Periodicidade
                            </label>
                            <Select
                                value={formData.periodicity}
                                onValueChange={(value) => setFormData({ ...formData, periodicity: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="once">Único</SelectItem>
                                    <SelectItem value="weekly">Semanal</SelectItem>
                                    <SelectItem value="monthly">Mensal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_next"
                                checked={formData.is_next}
                                onChange={(e) => setFormData({ ...formData, is_next: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <label htmlFor="is_next" className="text-sm font-medium text-gray-700">
                                Marcar como próximo racha 🔥
                            </label>
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
