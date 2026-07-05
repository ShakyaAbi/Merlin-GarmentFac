-- Add optional due date to purchase invoices
ALTER TABLE "Purchase"
ADD COLUMN "dueDate" TIMESTAMP(3);
