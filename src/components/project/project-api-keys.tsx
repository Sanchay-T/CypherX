"use client";

import { useState } from "react";
import { Copy, Ellipsis, KeyRound, Plus, Shield, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import type { Project } from "@/data/projects";
import { cn } from "@/lib/utils";

type Props = {
  project: Project;
};

export function ProjectApiKeys({ project }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">API keys</CardTitle>
          <CardDescription>
            Rotate, revoke, and scope credentials per environment.
          </CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" /> Create key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate new API key</DialogTitle>
              <DialogDescription>
                Keys inherit environment defaults. You can scope further after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input id="label" placeholder="Edge worker" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scopes">Scopes</Label>
                <Input id="scopes" placeholder="read,write" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => setIsOpen(false)}>
                Generate key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {project.apiKeys.length === 0 ? (
          <EmptyState
            title="No API keys yet"
            description="Generate credentials to share with your first integration."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium text-foreground">{key.label}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        key.status === "active" && "bg-emerald-500/10 text-emerald-500",
                        key.status === "rotated" && "bg-amber-500/10 text-amber-500",
                        key.status === "revoked" && "bg-destructive/10 text-destructive",
                      )}
                    >
                      <KeyRound className="size-3" /> {key.status}
                    </span>
                  </TableCell>
                  <TableCell>{key.lastUsed}</TableCell>
                  <TableCell className="text-muted-foreground">{key.scopes.join(", ")}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Copy key"
                      >
                        <Copy className="size-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Ellipsis className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Shield className="size-4" /> Rotate key
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive">
                            <Trash className="size-4" /> Revoke key
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
