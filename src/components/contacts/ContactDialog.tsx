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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  manager_name: z.string().trim().max(100).optional(),
  manager_position: z.string().trim().max(100).optional(),
  manager_phone: z.string().trim().max(20).optional(),
  manager_email: z.string().trim().email("Email inválido").or(z.literal("")).optional(),
});

interface Contact {
  id?: string;
  name: string;
  document: string;
  document_type: string;
  type: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  manager_name?: string;
  manager_position?: string;
  manager_phone?: string;
  manager_email?: string;
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
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip_code: "",
    },
    manager_name: "",
    manager_position: "",
    manager_phone: "",
    manager_email: "",
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
        address: contact.address || {
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
          zip_code: "",
        } as any,
        manager_name: contact.manager_name || "",
        manager_position: contact.manager_position || "",
        manager_phone: contact.manager_phone || "",
        manager_email: contact.manager_email || "",
      });
    } else {
      setFormData({
        name: "",
        document: "",
        document_type: "cpf",
        type: "client",
        email: "",
        phone: "",
        address: {
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
          zip_code: "",
        },
        manager_name: "",
        manager_position: "",
        manager_phone: "",
        manager_email: "",
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
        name: formData.name,
        document: formData.document,
        document_type: formData.document_type,
        type: formData.type,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address,
        manager_name: formData.manager_name || null,
        manager_position: formData.manager_position || null,
        manager_phone: formData.manager_phone || null,
        manager_email: formData.manager_email || null,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact ? "Editar Contato" : "Novo Contato"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
              <TabsTrigger value="address">Endereço</TabsTrigger>
              <TabsTrigger value="manager">Gestor Responsável</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome da Empresa *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome da empresa"
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
            </TabsContent>

            <TabsContent value="address" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    value={formData.address.zip_code}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        address: { ...formData.address, zip_code: e.target.value }
                      })
                    }
                    placeholder="00000-000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        address: { ...formData.address, state: e.target.value }
                      })
                    }
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        address: { ...formData.address, city: e.target.value }
                      })
                    }
                    placeholder="São Paulo"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Bairro</Label>
                  <Input
                    value={formData.address.neighborhood}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        address: { ...formData.address, neighborhood: e.target.value }
                      })
                    }
                    placeholder="Centro"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rua</Label>
                  <Input
                    value={formData.address.street}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        address: { ...formData.address, street: e.target.value }
                      })
                    }
                    placeholder="Rua das Flores"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    value={formData.address.number}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        address: { ...formData.address, number: e.target.value }
                      })
                    }
                    placeholder="123"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Complemento</Label>
                  <Input
                    value={formData.address.complement}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        address: { ...formData.address, complement: e.target.value }
                      })
                    }
                    placeholder="Sala 456"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manager" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome do Gestor</Label>
                  <Input
                    value={formData.manager_name}
                    onChange={(e) =>
                      setFormData({ ...formData, manager_name: e.target.value })
                    }
                    placeholder="Nome completo do gestor"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={formData.manager_position}
                    onChange={(e) =>
                      setFormData({ ...formData, manager_position: e.target.value })
                    }
                    placeholder="Diretor, Gerente, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone do Gestor</Label>
                  <Input
                    value={formData.manager_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, manager_phone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Email do Gestor</Label>
                  <Input
                    type="email"
                    value={formData.manager_email}
                    onChange={(e) =>
                      setFormData({ ...formData, manager_email: e.target.value })
                    }
                    placeholder="gestor@exemplo.com"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

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
