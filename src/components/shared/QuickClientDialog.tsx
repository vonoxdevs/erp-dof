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
  formatCEP,
} from "@/lib/brazilian-validations";
import { buscarCNPJ } from "@/services/externalApiService";
import { Loader2 } from "lucide-react";

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
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
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
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    document_type: "cpf",
    email: "",
    phone: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      console.log('🔄 Iniciando criação de cliente...');

      // Validação
      const validation = clientSchema.safeParse(formData);
      if (!validation.success) {
        console.error('❌ Validação falhou:', validation.error.errors);
        toast.error(validation.error.errors[0].message);
        return;
      }

      console.log('✅ Validação passou');

      // Buscar company_id do usuário
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        console.error('❌ Empresa não encontrada');
        throw new Error("Empresa não encontrada");
      }

      console.log('✅ Company ID:', profile.company_id);

      // Criar cliente
      const hasAddress = formData.cep || formData.street || formData.number || 
                        formData.neighborhood || formData.city || formData.state;
      
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          company_id: profile.company_id,
          name: formData.name,
          document: formData.document,
          document_type: formData.document_type,
          type: "client",
          email: formData.email || null,
          phone: formData.phone || null,
          address: hasAddress ? {
            zip_code: formData.cep || "",
            street: formData.street || "",
            number: formData.number || "",
            complement: formData.complement || "",
            neighborhood: formData.neighborhood || "",
            city: formData.city || "",
            state: formData.state || "",
          } : null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao inserir cliente:', error);
        throw error;
      }

      console.log('✅ Cliente criado com ID:', data.id);
      toast.success("Cliente criado com sucesso!");

      // Chamar callback com o ID do cliente
      console.log('🔄 Chamando onClientCreated...');
      onClientCreated(data.id);
      
      console.log('🔄 Fechando dialog...');
      handleClose();
    } catch (error: any) {
      console.error("❌ Erro completo ao criar cliente:", error);
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
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    });
    onClose();
  };

  const handleCNPJBlur = async () => {
    if (formData.document_type !== "cnpj") return;
    
    const cleanCNPJ = formData.document.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) return;

    try {
      setLoadingCNPJ(true);
      const data = await buscarCNPJ(cleanCNPJ);
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          name: data.razao_social || prev.name,
          email: data.email || prev.email,
          phone: data.telefone || prev.phone,
          cep: data.cep || prev.cep,
          street: data.logradouro || prev.street,
          number: data.numero || prev.number,
          complement: data.complemento || prev.complement,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.municipio || prev.city,
          state: data.uf || prev.state,
        }));
        toast.success("Dados da empresa carregados!");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao buscar CNPJ");
    } finally {
      setLoadingCNPJ(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && !loading) {
        handleClose();
      }
    }} modal>
      <DialogContent 
        className="sm:max-w-[500px]" 
        onInteractOutside={(e) => {
          if (loading) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (loading) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          e.stopPropagation();
        }}
      >
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
              <div className="relative">
                <Input
                  id="document"
                  value={formData.document}
                  onChange={(e) => {
                    const value = e.target.value;
                    const formatted =
                      formData.document_type === "cpf" ? formatCPF(value) : formatCNPJ(value);
                    setFormData({ ...formData, document: formatted });
                  }}
                  onBlur={handleCNPJBlur}
                  placeholder={formData.document_type === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  maxLength={formData.document_type === "cpf" ? 14 : 18}
                  required
                  disabled={loadingCNPJ}
                />
                {loadingCNPJ && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
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

          {formData.document_type === "cnpj" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) =>
                      setFormData({ ...formData, cep: formatCEP(e.target.value) })
                    }
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value.toUpperCase() })
                    }
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="São Paulo"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="street">Logradouro</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) =>
                      setFormData({ ...formData, street: e.target.value })
                    }
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) =>
                      setFormData({ ...formData, number: e.target.value })
                    }
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) =>
                      setFormData({ ...formData, neighborhood: e.target.value })
                    }
                    placeholder="Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) =>
                      setFormData({ ...formData, complement: e.target.value })
                    }
                    placeholder="Apto, Sala, etc."
                  />
                </div>
              </div>
            </>
          )}

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
