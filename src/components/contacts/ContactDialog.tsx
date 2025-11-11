import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { sanitizeError } from "@/lib/errorMapping";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  document: z.string().trim().min(1, "Documento é obrigatório").max(20),
  document_type: z.enum(["cpf", "cnpj"]),
  type: z.enum(["client", "supplier", "both"]),
  email: z.string().trim().email("Email inválido").or(z.literal("")),
  phone: z.string().trim().max(20).or(z.literal("")),
});

interface Contact {
  id?: string;
  name: string;
  document: string;
  document_type: string;
  type: string;
  email?: string;
  phone?: string;
}

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  contact: Contact | null;
}

export function ContactDialog({ open, onClose, contact }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    document_type: "cpf" as "cpf" | "cnpj",
    type: "client" as "client" | "supplier" | "both",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        document: contact.document,
        document_type: contact.document_type as "cpf" | "cnpj",
        type: contact.type as "client" | "supplier" | "both",
        email: contact.email || "",
        phone: contact.phone || "",
      });
    } else {
      setFormData({
        name: "",
        document: "",
        document_type: "cpf",
        type: "client",
        email: "",
        phone: "",
      });
    }
  }, [contact, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Perfil não encontrado");

      const validationResult = contactSchema.safeParse(formData);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors
          .map((err) => err.message)
          .join(", ");
        throw new Error(errorMessages);
      }

      const dataToSave = {
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
        company_id: profile.company_id,
      };

      if (contact?.id) {
        const { error } = await supabase
          .from("contacts")
          .update(dataToSave)
          .eq("id", contact.id);
        if (error) throw error;
        toast.success("Contato atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("contacts").insert([dataToSave]);
        if (error) throw error;
        toast.success("Contato criado com sucesso!");
      }

      onClose(true);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {contact ? "Editar Contato" : "Novo Contato"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do contato"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Documento *</Label>
              <Select
                value={formData.document_type}
                onValueChange={(value: "cpf" | "cnpj") =>
                  setFormData({ ...formData, document_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Documento *</Label>
              <Input
                value={formData.document}
                onChange={(e) =>
                  setFormData({ ...formData, document: e.target.value })
                }
                placeholder={formData.document_type === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "client" | "supplier" | "both") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="supplier">Fornecedor</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {contact ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
