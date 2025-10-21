export type MasterKeyword = {
  id: string
  keyword: string
  transactionType: "Debit" | "Credit" | "Both"
  ledger: string
  particulars: string
  preferences?: string
}

export const masterKeywords: MasterKeyword[] = [
  {
    id: "upi-credit",
    keyword: "upi",
    transactionType: "Credit",
    ledger: "UPI-Cr",
    particulars: "Income",
  },
  {
    id: "upi-debit",
    keyword: "upi",
    transactionType: "Debit",
    ledger: "UPI-Dr",
    particulars: "Other Expenses / Payments",
  },
  {
    id: "service-charges",
    keyword: "servicecharges",
    transactionType: "Debit",
    ledger: "Bank Charges",
    particulars: "Other Expenses / Payments",
  },
  {
    id: "emi",
    keyword: "emi",
    transactionType: "Debit",
    ledger: "Probable EMI",
    particulars: "Loans & Liabilities",
  },
  {
    id: "interest-received",
    keyword: "int.pd",
    transactionType: "Credit",
    ledger: "Bank Interest Received",
    particulars: "Other Income",
  },
  {
    id: "refund",
    keyword: "imps:rec",
    transactionType: "Credit",
    ledger: "Refund/Reversal",
    particulars: "Adjustments",
  },
  {
    id: "gst",
    keyword: "gst",
    transactionType: "Debit",
    ledger: "GST Paid",
    particulars: "Taxes",
  },
  {
    id: "investment",
    keyword: "growwpay",
    transactionType: "Debit",
    ledger: "Investment",
    particulars: "Investments",
  },
]
