const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pqroxmeyuicutatbessb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcm94bWV5dWljdXRhdGJlc3NiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI2ODUyMSwiZXhwIjoyMDg2ODQ0NTIxfQ.FrSaKlm5tY--l1VSuhhL17VC71-Z7VBQtlUo0KRVMwg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkManual() {
    const { data: rachas } = await supabase.from('rachas').select('id, location, name');
    const manualRacha = rachas.find(r => r.location === 'Sistema (Manual)' || r.name === 'Ajustes Globais Manuais');

    if (!manualRacha) {
        console.log('Manual racha NOT found.');
        return;
    }

    console.log('Manual Racha ID:', manualRacha.id);
    const { count } = await supabase.from('racha_scouts').select('*', { count: 'exact', head: true }).eq('racha_id', manualRacha.id);
    console.log('Scouts for manual racha:', count);

    if (count > 0) {
        const { data: sample } = await supabase.from('racha_scouts').select('*, members(name)').eq('racha_id', manualRacha.id).limit(5);
        console.log('Sample scouts:', JSON.stringify(sample, null, 2));
    }
}

checkManual();
