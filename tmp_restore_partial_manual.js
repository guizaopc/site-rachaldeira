const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pqroxmeyuicutatbessb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcm94bWV5dWljdXRhdGJlc3NiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI2ODUyMSwiZXhwIjoyMDg2ODQ0NTIxfQ.FrSaKlm5tY--l1VSuhhL17VC71-Z7VBQtlUo0KRVMwg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const baseAdjustments = [
    { name: 'Brunão', games: 1, goals: 12, assists: 0, saves: 2, top1: 0, top2: 0, top3: 1, sheriff: 0 },
    { name: "Bruno BUIU'", games: 2, goals: 4, assists: 8, saves: 82, top1: 2, top2: 0, top3: 2, sheriff: 0 },
    { name: 'Caique', games: 0, goals: 2, assists: 0, saves: 0, top1: 0, top2: 0, top3: 0, sheriff: 0 },
    { name: 'Caldeira', games: 1, goals: 7, assists: 12, saves: 0, top1: 1, top2: 0, top3: 0, sheriff: 0 },
    { name: 'Daniel Santos', games: 2, goals: 8, assists: 13, saves: 0, top1: 0, top2: 1, top3: 1, sheriff: 0 },
    { name: 'Diego de Jesus', games: 1, goals: 4, assists: 3, saves: 0, top1: 0, top2: 1, top3: 0, sheriff: 0 },
    { name: 'Diogo Henrique', games: 2, goals: 5, assists: 9, saves: 1, top1: 0, top2: 0, top3: 2, sheriff: 1 }
];

async function restoreManual() {
    const { data: adjRacha } = await supabase.from('rachas').select('id').eq('location', 'Sistema (Manual)').maybeSingle();
    if (!adjRacha) return;

    const { data: members } = await supabase.from('members').select('id, name');

    for (const adj of baseAdjustments) {
        const member = members.find(m => m.name.toLowerCase().trim() === adj.name.toLowerCase().trim());
        if (member) {
            await supabase.from('racha_scouts').upsert({
                racha_id: adjRacha.id,
                member_id: member.id,
                goals: adj.goals,
                assists: adj.assists,
                difficult_saves: adj.saves,
                attendance_count: adj.games,
                top1_count: adj.top1,
                top2_count: adj.top2,
                top3_count: adj.top3,
                sheriff_count: adj.sheriff
            }, { onConflict: 'racha_id,member_id' });
        }
    }
    console.log('Restored partial manual values.');
}

restoreManual();
