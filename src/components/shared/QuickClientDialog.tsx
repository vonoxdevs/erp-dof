import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import {
  validateCPF,
  validateCNPJ,
  validateEmail,
  validatePhone,
  formatCPF,
  formatCNPJ,
  formatPhone,
} from "@/lib/brazilian-validations";

const clientSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  document: z.string().trim().min(1, "CPF/CNPJ é obrigatório").max(20, "Documento inválido"),
  document_type: z.enum(["cpf", "cnpj"]),
  email: z
    .string()
    .trim()
    .max(255, "Email muito longo")
    .refine((val) => !val || validateEmail(val), { message: "Email inválido" }),
  phone: z
    .string()
    .trim()
    .max(20, "Telefone muito longo")
    .refine((val) => !val || validatePhone(val), { message: "Telefone inválido" })
    .optional(),
}).refine(
  (data) => {
    if (data.document_type === "cpf") {
      return validateCPF(data.document);
    } else {
      return validateCNPJ(data.document);
    }
  },
  {
    message: "CPF/CNPJ inválido",
    path: ["document"],
  }
);

interface Props {
  open: boolean;
  onClose: () => void;
  onClientCreated: (clientId: string) => void;
}

export function QuickClientDialog({ open, onClose, onClientCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    document_type: "cpf",
    email: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validação
      const validation = clientSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      // Buscar company_id do usuário
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error("Empresa não encontrada");
      }

      // Criar cliente
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          company_id: profile.company_id,
          name: formData.name,
          document: formData.document,
          document_type: formData.document_type,
          type: "customer",
          email: formData.email || null,
          phone: formData.phone || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Cliente criado com sucesso!");

      onClientCreated(data.id);
      handleClose();
    } catch (error: any) {
      console.error("Erro ao criar cliente:", error);
      toast.error(error.message || "Erro ao criar cliente");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      document: "",
      document_type: "cpf",
      email: "",
      phone: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()} modal={true}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do cliente"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="document_type">Tipo de Documento *</Label>
              <Select
                value={formData.document_type}
                onValueChange={(value) => setFormData({ ...formData, document_type: value, document: "" })}
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
              <Label htmlFor="document">CPF/CNPJ *</Label>
              <Input
                id="document"
                value={formData.document}
                onChange={(e) => {
                  const value = e.target.value;
                  const formatted =
                    formData.document_type === "cpf" ? formatCPF(value) : formatCNPJ(value);
                  setFormData({ ...formData, document: formatted });
                }}
                placeholder={formData.document_type === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                maxLength={formData.document_type === "cpf" ? 14 : 18}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                setFormData({ ...formData, phone: formatted });
              }}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
