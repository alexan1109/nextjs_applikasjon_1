import { PrismaClient } from '@prisma/client';
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

const prisma = new PrismaClient();
/**
 * Fetches income data from the database.
 * @returns {Promise<Income[]>} A promise that resolves to an array of income data.
 */
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).

export async function fetchIncome() {
  try {
    const data = await prisma.income.findMany({
      orderBy: { month: 'asc' },
    });
    return data;
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
    const data = await prisma.invoices.findMany({
      include: {
        sellers: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 5,
    });

    return data.map((invoice) => ({
      id: invoice.id,
      name: invoice.sellers.name,
      email: invoice.sellers.email,
      image_url: invoice.sellers.image_url,
      amount: formatCurrency(invoice.amount),
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    const [invoiceCount, sellerCount, invoices] = await Promise.all([
      prisma.invoices.count(),
      prisma.sellers.count(),
      prisma.invoices.findMany(),
    ]);

    const totalFulfilled = invoices
      .filter((i) => i.status === 'fulfilled')
      .reduce((sum, i) => sum + i.amount, 0);

    const totalAwaiting = invoices
      .filter((i) => i.status === 'awaiting')
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      numberOfInvoices: invoiceCount,
      numberOfSellers: sellerCount,
      totalFulfilledInvoices: formatCurrency(totalFulfilled),
      totalAwaitingInvoices: formatCurrency(totalAwaiting),
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
    const data = await prisma.invoices.findMany({
      include: {
        sellers: true,
      },
      where: {
        OR: [
          { sellers: { name: { contains: query, mode: 'insensitive' } } },
          { sellers: { email: { contains: query, mode: 'insensitive' } } },
          { amount: { equals: Number(query) || undefined } },
          { status: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { date: 'desc' },
      skip: offset,
      take: ITEMS_PER_PAGE,
    });

    return data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount,
      date: invoice.date,
      status: invoice.status,
      name: invoice.sellers.name,
      email: invoice.sellers.email,
      image_url: invoice.sellers.image_url,
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}
export async function fetchInvoicesPages(query: string) {
  try {
    const count = await prisma.invoices.count({
      where: {
        OR: [
          { sellers: { name: { contains: query, mode: 'insensitive' } } },
          { sellers: { email: { contains: query, mode: 'insensitive' } } },
          { status: { contains: query, mode: 'insensitive' } },
        ],
      },
    });

    return Math.ceil(count / ITEMS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}
export async function fetchInvoiceById(id: string) {
  try {
    const invoice = await prisma.invoices.findUnique({
      where: { id },
    });

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
    return await prisma.sellers.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all sellers.');
  }
}

export async function fetchFilteredSellers(query: string) {
  try {
    const sellers = await prisma.sellers.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        invoices: true,
      },
      orderBy: { name: 'asc' },
    });

    return sellers.map((seller) => {
      const total_invoices = seller.invoices.length;

      const total_awaiting = seller.invoices
        .filter((i) => i.status === 'awaiting')
        .reduce((sum, i) => sum + i.amount, 0);

      const total_fulfilled = seller.invoices
        .filter((i) => i.status === 'fulfilled')
        .reduce((sum, i) => sum + i.amount, 0);

      return {
        ...seller,
        total_invoices,
        total_awaiting: formatCurrency(total_awaiting),
        total_fulfilled: formatCurrency(total_fulfilled),
      };
    });
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch seller table.');
  }
}

export async function getUser(email: string) {
  try {
    return await prisma.users.findUnique({
      where: { email },
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
