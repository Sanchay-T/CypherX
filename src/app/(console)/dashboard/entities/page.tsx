"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Eye, Edit2, Trash2, Search, Building2, User, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Entity {
  id: string;
  name: string;
  type: string;
  aliases: string[];
  match_count: number;
}

interface PreviewMatch {
  description: string;
  amount: number;
  date: string;
  matched_text: string;
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "person",
    aliases: [""],
  });

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const res = await fetch("/api/ai/entities");
      const data = await res.json();
      setEntities(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load entities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntity = async () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Entity name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch("/api/ai/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          aliases: formData.aliases.filter((a) => a.trim()),
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `Entity "${formData.name}" added successfully`,
        });
        setAddDialogOpen(false);
        setFormData({ name: "", type: "person", aliases: [""] });
        fetchEntities();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add entity",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEntity = async (id: string, name: string) => {
    if (!confirm(`Delete entity "${name}"?`)) return;

    try {
      const res = await fetch(`/api/ai/entities/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({
          title: "Success",
          description: `Entity "${name}" deleted`,
        });
        fetchEntities();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete entity",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async (entity: Entity) => {
    try {
      const res = await fetch("/api/ai/entities/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: entity.name,
          type: entity.type,
          aliases: entity.aliases,
        }),
      });

      const data = await res.json();
      setPreviewData(data);
      setPreviewDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to preview matches",
        variant: "destructive",
      });
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validTypes.includes(fileExt)) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/ai/entities/bulk-import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Import Successful!",
          description: `Imported ${data.imported.length} entities. ${data.skipped.length} skipped.`,
        });
        fetchEntities();

        // Trigger global refresh
        window.dispatchEvent(new CustomEvent('entitiesUpdated'));
      } else {
        toast({
          title: "Import Failed",
          description: data.detail || "Failed to import entities",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import entities",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadSample = (format: 'csv' | 'excel') => {
    const csvContent = `name,type,aliases
John Doe,person,"J Doe,John D,Johnny"
Acme Corporation,company,"Acme Corp,ACME"
Tech Solutions,business,"Tech Sol,TechSolutions Pvt Ltd"
Jane Smith,person,"J Smith,Jane S"
Global Traders,business,"Global Trading Co,GT"`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_entities.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Sample Downloaded",
      description: `sample_entities.${format === 'csv' ? 'csv' : 'xlsx'} downloaded`,
    });
  };

  const filteredEntities = entities.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Master Entity Panel</h1>
        <p className="text-muted-foreground">
          Track specific people and businesses across your statements
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleDownloadSample('csv')}
            title="Download sample CSV"
          >
            <Download className="h-4 w-4 mr-2" />
            Sample CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleBulkImport}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "Importing..." : "Import CSV/Excel"}
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entity
          </Button>
        </div>
      </div>

      {/* Entities Table */}
      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left p-4 font-medium">Entity Name</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Aliases</th>
                <th className="text-left p-4 font-medium">Found In</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted-foreground">
                    Loading entities...
                  </td>
                </tr>
              ) : filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted-foreground">
                    {searchQuery
                      ? "No entities match your search"
                      : "No entities yet. Add your first entity to get started!"}
                  </td>
                </tr>
              ) : (
                filteredEntities.map((entity) => (
                  <tr key={entity.id} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {entity.type === "person" ? (
                          <User className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Building2 className="h-4 w-4 text-green-500" />
                        )}
                        <span className="font-medium">{entity.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize">
                        {entity.type}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {entity.aliases.length > 0 ? (
                          entity.aliases.slice(0, 3).map((alias, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {alias}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No aliases</span>
                        )}
                        {entity.aliases.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{entity.aliases.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="default">{entity.match_count} txns</Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePreview(entity)}
                          title="Preview matches"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteEntity(entity.id, entity.name)}
                          title="Delete entity"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entity Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Entity</DialogTitle>
            <DialogDescription>
              Add a person or business you want to track across statements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Entity Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Sanchay, Business A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="type">Entity Type *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Person</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Aliases (optional)</Label>
              <div className="space-y-2">
                {formData.aliases.map((alias, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="e.g., S Gupta, Sanchay Gupta"
                      value={alias}
                      onChange={(e) => {
                        const newAliases = [...formData.aliases];
                        newAliases[i] = e.target.value;
                        setFormData({ ...formData, aliases: newAliases });
                      }}
                    />
                    {i === formData.aliases.length - 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setFormData({ ...formData, aliases: [...formData.aliases, ""] })
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Add alternative names or variations
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEntity}>Add Entity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Preview: "{previewData?.name}" found in {previewData?.total_matches || 0} transactions
            </DialogTitle>
            <DialogDescription>Sample matches from recent statements</DialogDescription>
          </DialogHeader>

          {previewData?.sample_matches?.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {previewData.sample_matches.map((match: PreviewMatch, i: number) => (
                <div key={i} className="border rounded-lg p-3 hover:bg-muted/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{match.date || "N/A"}</span>
                    <Badge variant={match.amount > 0 ? "default" : "secondary"}>
                      ₹{Math.abs(match.amount).toLocaleString("en-IN")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {match.matched_text || match.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No matches found</p>
          )}

          <DialogFooter>
            <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          💡 <strong>Tip:</strong> Add entities you frequently transact with for better categorization and
          reporting. The system will automatically identify them in your statements!
        </p>
      </div>
    </div>
  );
}