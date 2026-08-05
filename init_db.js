import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

// Supabase Direct Postgres Connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.mjybrumxuabubnjqayki:SHAMS_ERP_2026@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  console.log('Connecting to PostgreSQL...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SHAMS_ERP_2026@db.mjybrumxuabubnjqayki.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database!');
    
    console.log('Creating team_expense_cards table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_expense_cards (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES installation_teams(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        total_amount NUMERIC NOT NULL DEFAULT 0,
        card_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('Creating team_expense_items table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_expense_items (
        id SERIAL PRIMARY KEY,
        card_id INTEGER NOT NULL REFERENCES team_expense_cards(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount NUMERIC NOT NULL DEFAULT 0,
        item_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('Tables created successfully via PG!');
    await client.end();
  } catch (err) {
    console.error('PG Connection / Query error:', err.message);
  }
}

main();
