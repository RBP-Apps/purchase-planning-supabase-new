const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const tables = ['planning_item_master', 'receipt_item_master', 'purchase_order_master'];
  
  for (const table of tables) {
    console.log(`--- Columns for ${table} ---`);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      continue;
    }
    
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log('No data found to determine columns.');
    }
  }
}

checkColumns();
