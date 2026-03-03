const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pqroxmeyuicutatbessb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcm94bWV5dWljdXRhdGJlc3NiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI2ODUyMSwiZXhwIjoyMDg2ODQ0NTIxfQ.FrSaKlm5tY--l1VSuhhL17VC71-Z7VBQtlUo0KRVMwg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkVital() {
    const { data, count, error } = await supabase.from('manual_ranking_adjustments').select('*', { count: 'exact' });
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Manual Adjustments Count:', count);
    if (count > 0) {
        console.log('Sample:', JSON.stringify(data[0], null, 2));
    }
}

checkVital();
