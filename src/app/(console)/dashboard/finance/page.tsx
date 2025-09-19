import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ledger = [
  { date: "Sep 18", description: "Launchpad API – usage", amount: "$142.88", status: "Pending" },
  { date: "Sep 17", description: "Launchpad API – usage", amount: "$138.42", status: "Posted" },
  { date: "Sep 16", description: "Launchpad API – usage", amount: "$136.21", status: "Posted" },
];

export default function FinancePage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Revenue & ledger"
        description="Track daily accruals, payouts, and customer balances."
      />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Ledger</CardTitle>
          <CardDescription>Synced to your finance system every 24 hours.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((entry) => (
                <TableRow key={entry.date + entry.description}>
                  <TableCell className="font-medium text-foreground">{entry.date}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-right">{entry.amount}</TableCell>
                  <TableCell>{entry.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
