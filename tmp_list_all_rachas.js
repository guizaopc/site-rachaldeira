const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pqroxmeyuicutatbessb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcm94bWV5dWljdXRhdGJlc3NiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI2ODUyMSwiZXhwIjoyMDg2ODQ0NTIxfQ.FrSaKlm5tY--l1VSuhhL17VC71-Z7VBQtlUo0KRVMwg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listRachas() {
    const { data } = await supabase.from('rachas').select('id, location, name, status');
    console.log(JSON.stringify(data, null, 2));
}

listRachas();
