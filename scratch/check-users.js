import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  try {
    const { data: users, error } = await supabase.from('User').select('*');
    if (error) throw error;
    console.log("Users in DB:");
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error querying users:", err.message);
  }
}

checkUsers();
