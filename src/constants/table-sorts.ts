// The columns each server-paginated table may sort by (?sort=).
export const TRANSACTION_SORTS = ["date", "description", "category", "channel", "amount"];
export const INVOICE_SORTS = ["client", "issueDate", "dueDate", "amount", "status"];
export const ORDER_SORTS = ["orderDate", "customer", "totalPrice", "amountPaid", "status"];
export const REQUEST_SORTS = ["requestedDate", "customer", "totalPrice", "amountPaid"];
