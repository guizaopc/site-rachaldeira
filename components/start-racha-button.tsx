'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';

export default function StartRachaButton({ rachaId }: { rachaId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleStartRacha = async () => {
        if (!confirm('Deseja iniciar o racha? Isso encerrará as confirmações de presença.')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('rachas')
                .update({ status: 'in_progress' })
                .eq('id', rachaId);

            if (error) throw error;

            router.refresh();
        } catch (error: any) {
            alert('Erro ao iniciar racha: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleStartRacha}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white gap-2 w-full sm:w-auto"
        >
            <Play size={16} />
            {loading ? 'Iniciando...' : 'Iniciar Racha'}
        </Button>
    );
}
