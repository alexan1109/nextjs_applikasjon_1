require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const {
  invoices,
  sellers,
  income,
  users,
} = require('../app/lib/placeholder-data.js');

async function resetDatabase(client) {
  console.log('Resetting database...');

  await client.query(`
    DROP TABLE IF EXISTS invoices, sellers, users, income CASCADE;
  `);

  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
}

async function seedUsers(client) {
  await client.query(`
    CREATE TABLE users (
      id UUID PRIMARY KEY,
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
       VALUES ($1, $2, $3, $4)`,
      [user.id ?? uuidv4(), user.name, user.email, hashedPassword]
    );
  }

  console.log(`Seeded ${users.length} users`);
}

async function seedSellers(client) {
  await client.query(`
    CREATE TABLE sellers (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `);

  console.log('Created "sellers" table');

  for (const seller of sellers) {
    await client.query(
      `INSERT INTO sellers (id, name, email, image_url)
       VALUES ($1, $2, $3, $4)`,
      [seller.id ?? uuidv4(), seller.name, seller.email, seller.image_url]
    );
  }

  console.log(`Seeded ${sellers.length} sellers`);
}

async function seedInvoices(client) {
  await client.query(`
    CREATE TABLE invoices (
      id UUID PRIMARY KEY,
      seller_id UUID NOT NULL REFERENCES sellers(id),
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `);

  console.log('Created "invoices" table');

  for (const invoice of invoices) {
    await client.query(
      `INSERT INTO invoices (id, seller_id, amount, status, date)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(), // ✅ always generate ID
        invoice.seller_id,
        invoice.amount,
        invoice.status,
        invoice.date,
      ]
    );
  }

  console.log(`Seeded ${invoices.length} invoices`);
}

async function seedIncome(client) {
  await client.query(`
    CREATE TABLE income (
      month VARCHAR(4) PRIMARY KEY,
      income INT NOT NULL
    );
  `);

  console.log('Created "income" table');

  for (const item of income) {
    await client.query(
      `INSERT INTO income (month, income)
       VALUES ($1, $2)`,
      [item.month, item.income]
    );
  }

  console.log(`Seeded ${income.length} income`);
}

async function main() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
  });

  await client.connect();

  await resetDatabase(client); // 🔥 ensures clean state
  await seedUsers(client);
  await seedSellers(client);
  await seedInvoices(client);
  await seedIncome(client);

  await client.end();

  console.log('✅ Database seeding complete!');
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
});