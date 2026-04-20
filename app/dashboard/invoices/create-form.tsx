import { Button } from "@/app/ui/button";
import { createInvoice } from "@/app/lib/actions";
import { SellerField } from "@/app/lib/definitions";

export default function Form({sellers}: {Sellers: SellerField[]}) {
    return(
        <form action={createInvoice}>


        </form>
    );

}