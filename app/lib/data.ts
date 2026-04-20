import { sql } from '@vercel/postgres';
import {
  SellerField,
  SellersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Income,
} from './definitions';
import { formatCurrency } from './utils';
/**
 * Fetches income data from the database.
 * @returns {Promise<Income[]>} A promise that resolves to an array of income data.
 */
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).

export async function fetchIncome() {
  try {
    const data = await sql`SELECT * FROM income`;
    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch income data.');
  }
}
  


/**
 * Fetches the latest invoices from the database.
 * @returns {Promise<LatestInvoiceRaw[]>} A promise that resolves to an array of the latest invoices.
 */
export async function fetchLatestInvoices() {
  try {
    const data = await sql`SELECT invoices.amount, sellers.name, sellers.email 
    FROM invoices 
    JOIN sellers ON invoices.seller_id = sellersId
    ORDER BY invoices.date DESC
    LIMIT 5`;
    ;

   return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    const [invoiceCount, sellerCount, totals] = await Promise.all([
      sql`SELECT COUNT(*) FROM invoices`,
      sql`SELECT COUNT(*) FROM sellers`,
      sql`
        SELECT
          SUM(CASE WHEN status = 'fulfilled' THEN amount ELSE 0 END) AS fulfilled,
          SUM(CASE WHEN status = 'awaiting' THEN amount ELSE 0 END) AS awaiting
        FROM invoices
      `,
    ]);

    return {
      numberOfInvoices: Number(invoiceCount.rows[0].count),
      numberOfSellers: Number(sellerCount.rows[0].count),
      totalFulfilledInvoices: formatCurrency(totals.rows[0].fulfilled ?? 0),
      totalAwaitingInvoices: formatCurrency(totals.rows[0].awaiting ?? 0),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}
const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(query: string, currentPage: number) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const data = await sql`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        sellers.name,
        sellers.email,
        sellers.image_url
      FROM invoices
      JOIN sellers ON invoices.seller_id = sellers.id
      WHERE
        sellers.name ILIKE ${`%${query}%`} OR
        sellers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}
export async function fetchInvoicesPages(query: string) {
  try {
    const count = await sql`
      SELECT COUNT(*)
      FROM invoices
      JOIN sellers ON invoices.seller_id = sellers.id
      WHERE
        sellers.name ILIKE ${`%${query}%`} OR
        sellers.email ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
    `;

    return Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}
export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql`
      SELECT *
      FROM invoices
      WHERE id = ${id}
    `;

    const invoice = data.rows[0];

    if (!invoice) return null;

    return {
      ...invoice,
      amount: invoice.amount / 100,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}  
export async function fetchSellers() {
  try {
    const data = await sql`
      SELECT id, name
      FROM sellers
      ORDER BY name ASC
    `;

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch all sellers.');
  }
}

export async function fetchFilteredSellers(query: string) {
  try {
    const data = await sql`
      SELECT
        sellers.id,
        sellers.name,
        sellers.email,
        sellers.image_url,
        COUNT(invoices.id) AS total_invoices,
        SUM(CASE WHEN invoices.status = 'awaiting' THEN invoices.amount ELSE 0 END) AS total_awaiting,
        SUM(CASE WHEN invoices.status = 'fulfilled' THEN invoices.amount ELSE 0 END) AS total_fulfilled
      FROM sellers
      LEFT JOIN invoices ON sellers.id = invoices.seller_id
      WHERE
        sellers.name ILIKE ${`%${query}%`} OR
        sellers.email ILIKE ${`%${query}%`}
      GROUP BY sellers.id, sellers.name, sellers.email, sellers.image_url
      ORDER BY sellers.name ASC
    `;

    return data.rows.map((seller) => ({
      ...seller,
      total_awaiting: formatCurrency(seller.total_awaiting ?? 0),
      total_fulfilled: formatCurrency(seller.total_fulfilled ?? 0),
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch seller table.');
  }
}

export async function getUser(email: string) {
  try {
    const data = await sql`
      SELECT *
      FROM users
      WHERE email = ${email}
    `;

    return data.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
