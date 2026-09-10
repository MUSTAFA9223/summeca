-- Non-destructive index for InvoiceFlow client lookups and foreign-key maintenance.
CREATE INDEX IF NOT EXISTS invoiceflow_invoices_client_id_idx
  ON public.invoiceflow_invoices (client_id);
