import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { QuickClientDialog } from "./QuickClientDialog";

interface Contact {
  id: string;
  name: string;
  document: string;
  type: string;
}

interface SelectClienteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SelectCliente({
  value,
  onChange,
  placeholder = "Selecione um cliente",
  disabled = false,
}: SelectClienteProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    try {
      setLoading(true);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, document, type")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;

      setContacts(data || []);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }

  const handleClientCreated = async (clientId: string) => {
    await fetchContacts();
    onChange(clientId);
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? "Carregando..." : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {contacts.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                {loading ? "Carregando..." : "Nenhum cliente encontrado"}
              </div>
            ) : (
              contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  <div className="flex items-center gap-2">
                    <span>{contact.name}</span>
                    <span className="text-xs text-muted-foreground">({contact.document})</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setDialogOpen(true)}
          disabled={disabled}
          title="Novo Cliente"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <QuickClientDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onClientCreated={handleClientCreated}
      />
    </>
  );
}
