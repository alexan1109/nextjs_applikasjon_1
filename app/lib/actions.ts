'use server'
import {coerce, z} from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql } from '@vercel/postgres';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const FormSchema = z.object({
    id: z.string(),
    sellerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['awaiting', 'fulfilled']),
    date: z.string(),

});

const CreateInvoice = FormSchema.omit({id: true, date: true});

export async function createInvoice (formdata: FormData){
    const {sellerId, amount, status} = CreateInvoice.parse({
        sellerId: formdata.get('sellerId'),
        amount: formdata.get('amount'),
        status: formdata.get('status'),
    });
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    await sql`
    INSERT INTO invoices (sellerId, amount, status, date)
    VALUES (${sellerId}, ${amountInCents}, ${status}, ${date})
    `;
    const rawFormData = {
        sellerId: formdata.get('sellerId'),
        amount: formdata.get('amount'),
        status: formdata.get('status'),
    };

    console.log(rawFormData);

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}