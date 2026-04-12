require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const {
  invoices,
  sellers,
  income,
  users,
} = require('../app/lib/placeholder-data.js');

async function seedUsers(client) {
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);
    console.log('Created "users" table');

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await client.query(
        `INSERT INTO users (id, name, email, password)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING;`,
        [user.id, user.name, user.email, hashedPassword]
      );
    }

    console.log(`Seeded ${users.length} users`);
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

async function seedSellers(client) {
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sellers (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        image_url VARCHAR(255) NOT NULL
      );
    `);
    console.log('Created "sellers" table');

    for (const seller of sellers) {
      await client.query(
        `INSERT INTO sellers (id, name, email, image_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING;`,
        [seller.id, seller.name, seller.email, seller.image_url]
      );
    }

    console.log(`Seeded ${sellers.length} sellers`);
  } catch (error) {
    console.error('Error seeding sellers:', error);
    throw error;
  }
}

async function seedInvoices(client) {
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        seller_id UUID NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(255) NOT NULL,
        date DATE NOT NULL
      );
    `);
    console.log('Created "invoices" table');

    for (const invoice of invoices) {
      await client.query(
        `INSERT INTO invoices (seller_id, amount, status, date)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING;`,
        [invoice.seller_id, invoice.amount, invoice.status, invoice.date]
      );
    }

    console.log(`Seeded ${invoices.length} invoices`);
  } catch (error) {
    console.error('Error seeding invoices:', error);
    throw error;
  }
}

async function seedIncome(client) {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS income (
        month VARCHAR(4) NOT NULL UNIQUE,
        income INT NOT NULL
      );
    `);
    console.log('Created "income" table');

    for (const item of income) {
      await client.query(
        `INSERT INTO income (month, income)
         VALUES ($1, $2)
         ON CONFLICT (month) DO NOTHING;`,
        [item.month, item.income]
      );
    }

    console.log(`Seeded ${income.length} income`);
  } catch (error) {
    console.error('Error seeding income:', error);
    throw error;
  }
}

async function main() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL, // make sure your .env has POSTGRES_URL
  });

  await client.connect();

  await seedUsers(client);
  await seedSellers(client);
  await seedInvoices(client);
  await seedIncome(client);

  await client.end();
  console.log('Database seeding complete!');
}

main().catch((err) => {
  console.error('An error occurred while attempting to seed the database:', err);
});