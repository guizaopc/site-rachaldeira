'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Trash2, Lock, Unlock } from 'lucide-react';

export default function AdminVotacaoPage() {
    const [periods, setPeriods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPeriods();
    }, []);

    const loadPeriods = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('voting_periods')
            .select('*')
            .order('start_date', { ascending: false });

        setPeriods(data || []);
        setLoading(false);
    };

    const handleOpenModal = () => {
        setFormData({
            name: '',
            start_date: '',
            end_date: '',
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setError('');
        setSaving(true);

        try {
            const supabase = createClient();

            const { error: insertError } = await supabase
                .from('voting_periods')
                .insert({
                    name: formData.name,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    is_open: true,
                });

            if (insertError) throw insertError;

            setIsModalOpen(false);
            loadPeriods();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleOpen = async (periodId: string, currentStatus: boolean) => {
        const supabase = createClient();

        await supabase
            .from('voting_periods')
            .update({ is_open: !currentStatus })
            .eq('id', periodId);

        loadPeriods();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este período de votação?')) return;

        const supabase = createClient();
        await supabase.from('voting_periods').delete().eq('id', id);
        loadPeriods();
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            🗳️ Gerenciar Votação
                        </h1>
                        <p className="text-gray-600">
                            Crie e gerencie períodos de votação para Craque e Xerife
                        </p>
                    </div>
                    <Button onClick={handleOpenModal}>
                        <Plus size={20} className="mr-2" />
                        Novo Período
                    </Button>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Data de Início</TableHead>
                                    <TableHead>Data de Término</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {periods.map((period) => (
                                    <TableRow key={period.id}>
                                        <TableCell className="font-medium">{period.name}</TableCell>
                                        <TableCell>{new Date(period.start_date).toLocaleDateString('pt-BR')}</TableCell>
                                        <TableCell>{new Date(period.end_date).toLocaleDateString('pt-BR')}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs rounded ${period.is_open ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {period.is_open ? '✅ Aberto' : '🔒 Fechado'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleOpen(period.id, period.is_open)}
                                                title={period.is_open ? 'Fechar votação' : 'Abrir votação'}
                                            >
                                                {period.is_open ? <Lock size={16} /> : <Unlock size={16} />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(period.id)}
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
                    title="Novo Período de Votação"
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? 'Salvando...' : 'Criar'}
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Nome do Período *
                            </label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Votação Janeiro 2026"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Data de Início *
                                </label>
                                <Input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Data de Término *
                                </label>
                                <Input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                            ℹ️ O período será criado como <strong>Aberto</strong>. Os usuários poderão votar imediatamente.
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
