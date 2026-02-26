'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';

export default function OpenRachaButton({ rachaId }: { rachaId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleOpenRacha = async () => {
        if (!confirm('Deseja reabrir as confirmações para este racha?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('rachas')
                .update({ status: 'open' })
                .eq('id', rachaId);

            if (error) throw error;

            router.refresh();
        } catch (error: any) {
            alert('Erro ao abrir racha: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleOpenRacha}
            disabled={loading}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 gap-2 w-full sm:w-auto"
        >
            <RotateCcw size={16} />
            {loading ? 'Abrindo...' : 'Reabrir Confirmações'}
        </Button>
    );
}
