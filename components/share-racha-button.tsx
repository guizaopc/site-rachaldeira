'use client';

import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

interface Member {
    name: string;
}

interface Attendance {
    members: Member;
}

interface ShareRachaButtonProps {
    rachaName: string;
    rachaDate: string;
    rachaLocation: string;
    confirmedPlayers: any[];
    rachaId: string;
}

export default function ShareRachaButton({
    rachaName,
    rachaDate,
    rachaLocation,
    confirmedPlayers,
    rachaId
}: ShareRachaButtonProps) {

    const handleShare = () => {
        const baseUrl = window.location.origin;
        const rachaLink = `${baseUrl}/rachas/${rachaId}`;

        const playerList = confirmedPlayers
            .map((p, index) => `${index + 1}. ${p.members?.name || 'Jogador'}`)
            .join('\n');

        const text = `*⚽ DETALHES DO RACHA*\n\n` +
            `*📍 Local:* ${rachaLocation}\n` +
            `*📅 Data:* ${rachaDate}\n\n` +
            `✅ *Confirmados (${confirmedPlayers.length}):*\n` +
            `${playerList}\n\n` +
            `🔗 *Confirme sua presença aqui:* \n${rachaLink}`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <Button
            onClick={handleShare}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50 font-bold"
        >
            <Share2 size={16} />
            CONVOCAR NO WHATSAPP
        </Button>
    );
}
