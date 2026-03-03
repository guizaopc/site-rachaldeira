const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pqroxmeyuicutatbessb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcm94bWV5dWljdXRhdGJlc3NiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI2ODUyMSwiZXhwIjoyMDg2ODQ0NTIxfQ.FrSaKlm5tY--l1VSuhhL17VC71-Z7VBQtlUo0KRVMwg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCountsPerRacha() {
    const { data: rachas } = await supabase.from('rachas').select('id, name, location');
    for (const r of rachas) {
        const { count } = await supabase.from('racha_scouts').select('*', { count: 'exact', head: true }).eq('racha_id', r.id);
        console.log(`Racha ${r.id} (${r.name || r.location}): Scouts=${count}`);
    }
}

checkCountsPerRacha();
