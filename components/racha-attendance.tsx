'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Check, X, RotateCcw } from 'lucide-react';

interface RachaAttendanceProps {
    rachaId: string;
    initialStatus: 'in' | 'out' | null;
    isOpen: boolean;
    isAdmin?: boolean;
}

export default function RachaAttendance({ rachaId, initialStatus, isOpen, isAdmin }: RachaAttendanceProps) {
    const [status, setStatus] = useState<'in' | 'out' | null>(initialStatus);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleAttendance = async (newStatus: 'in' | 'out') => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert("Você precisa fazer login para confirmar presença.");
            setLoading(false);
            return;
        }

        // Get member_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('member_id')
            .eq('id', user.id)
            .single();

        if (!profile?.member_id) {
            alert("Seu perfil de membro não foi encontrado. Entre em contato com o admin.");
            setLoading(false);
            return;
        }

        // Upsert attendance
        // Note: racha_attendance logic usually checks user_id or member_id. Here we use member_id.
        // We need to fetch existing to update or insert new.
        // But upsert handles logic if unique constraint exists.
        // Assuming unique constraint on (racha_id, member_id).

        // First check if already exists to update properly or just upsert
        const { data: existing } = await supabase
            .from('racha_attendance')
            .select('id')
            .eq('racha_id', rachaId)
            .eq('member_id', profile.member_id)
            .single();

        let error;
        if (existing) {
            const { error: updateError } = await supabase
                .from('racha_attendance')
                .update({ status: newStatus })
                .eq('id', existing.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('racha_attendance')
                .insert({
                    racha_id: rachaId,
                    member_id: profile.member_id,
                    status: newStatus
                });
            error = insertError;
        }

        if (error) {
            console.error(error);
            alert("Erro ao salvar presença: " + error.message);
        } else {
            setStatus(newStatus);
            router.refresh(); // Refresh server components to update counts
        }
        setLoading(false);
    };

    if (!isOpen) {
        return (
            <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-yellow-800 font-semibold mb-1">
                            <span className="text-xl">⚠️</span>
                            Confirmações Encerradas
                        </div>
                        <p className="text-yellow-700 text-sm">
                            Rachaldeira em andamento ou fechada.
                        </p>
                    </div>
                    {isAdmin && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                if (confirm('Deseja reabrir as confirmações?')) {
                                    setLoading(true);
                                    await supabase.from('rachas').update({ status: 'open' }).eq('id', rachaId);
                                    router.refresh();
                                    setLoading(false);
                                }
                            }}
                            className="border-yellow-300 text-yellow-800 hover:bg-yellow-100 gap-2 font-bold"
                        >
                            <RotateCcw size={16} />
                            REABRIR CONFIRMAÇÕES
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Confirmação de Presença</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                    className={`h-14 text-lg font-bold transition-all shadow-md ${status === 'in'
                        ? 'bg-green-700 text-white ring-4 ring-green-300 scale-[1.02]'
                        : 'bg-green-500 hover:bg-green-600 text-white opacity-90 hover:opacity-100'
                        }`}
                    onClick={() => handleAttendance('in')}
                    disabled={loading}
                >
                    {loading && status === 'in' ? 'Salvando...' : (
                        <div className="flex items-center gap-2">
                            <Check className="h-6 w-6" strokeWidth={3} />
                            CONFIRMAR PRESENÇA
                        </div>
                    )}
                </Button>

                <Button
                    className={`h-14 text-lg font-bold transition-all shadow-md ${status === 'out'
                        ? 'bg-red-700 text-white ring-4 ring-red-300 scale-[1.02]'
                        : 'bg-red-500 hover:bg-red-600 text-white opacity-90 hover:opacity-100'
                        }`}
                    onClick={() => handleAttendance('out')}
                    disabled={loading}
                >
                    {loading && status === 'out' ? 'Salvando...' : (
                        <div className="flex items-center gap-2">
                            <X className="h-6 w-6" strokeWidth={3} />
                            NÃO VOU
                        </div>
                    )}
                </Button>
            </div>
        </div>
    );
}
