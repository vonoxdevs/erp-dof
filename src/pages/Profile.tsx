import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload, User, Building2 } from "lucide-react";

const Profile = () => {
  const { profile, company, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [userData, setUserData] = useState({
    full_name: "",
  });

  const [companyData, setCompanyData] = useState({
    name: "",
    legal_name: "",
    cnpj: "",
    email: "",
    phone: "",
    industry: "",
    size: "",
    logo_url: "",
  });

  useEffect(() => {
    if (profile) {
      setUserData({
        full_name: profile.full_name || "",
      });
    }
    if (company) {
      setCompanyData({
        name: company.name || "",
        legal_name: company.legal_name || "",
        cnpj: company.cnpj || "",
        email: company.email || "",
        phone: company.phone || "",
        industry: company.industry || "",
        size: company.size || "",
        logo_url: company.logo_url || "",
      });
    }
  }, [profile, company]);

  const handleUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ full_name: userData.full_name })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: companyData.name,
          legal_name: companyData.legal_name,
          email: companyData.email,
          phone: companyData.phone,
          industry: companyData.industry,
          size: companyData.size,
        })
        .eq("id", company.id);

      if (error) throw error;
      toast.success("Dados da empresa atualizados com sucesso!");
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar empresa");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !company) return;

    const file = e.target.files[0];
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${company.id}/logo.${fileExt}`;

    setUploading(true);
    try {
      // Remover logo anterior se existir
      if (companyData.logo_url) {
        const oldPath = companyData.logo_url.split('/company-logos/')[1];
        if (oldPath) {
          await supabase.storage
            .from('company-logos')
            .remove([oldPath]);
        }
      }

      // Upload da nova logo
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Atualizar banco de dados
      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', company.id);

      if (updateError) throw updateError;

      setCompanyData({ ...companyData, logo_url: publicUrl });
      toast.success("Logo atualizada com sucesso!");
      await refreshProfile();
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error(error.message || "Erro ao fazer upload da logo");
    } finally {
      setUploading(false);
    }
  };

  if (!profile || !company) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Perfil e Cadastro</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e da empresa</p>
      </div>

      <Tabs defaultValue="user" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="user">
            <User className="w-4 h-4 mr-2" />
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building2 className="w-4 h-4 mr-2" />
            Dados da Empresa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user">
          <Card className="p-6 glass">
            <form onSubmit={handleUserUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={userData.full_name}
                  onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card className="p-6 glass space-y-6">
            {/* Logo Upload */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Logo da Empresa</Label>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden bg-primary/5 hover:border-primary/50 transition-all">
                  {companyData.logo_url ? (
                    <img
                      src={companyData.logo_url}
                      alt="Logo da empresa"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <Building2 className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => document.getElementById("logo")?.click()}
                      disabled={uploading}
                      className="w-full sm:w-auto"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {companyData.logo_url ? "Alterar Logo" : "Upload Logo"}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Formatos aceitos: JPG, PNG, GIF<br/>
                      Tamanho máximo: 2MB<br/>
                      Recomendado: 400x400px com fundo transparente
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleCompanyUpdate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Fantasia</Label>
                  <Input
                    id="name"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Razão Social</Label>
                  <Input
                    id="legal_name"
                    value={companyData.legal_name}
                    onChange={(e) => setCompanyData({ ...companyData, legal_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={companyData.cnpj}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={companyData.phone}
                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Setor</Label>
                  <Select
                    value={companyData.industry}
                    onValueChange={(value) => setCompanyData({ ...companyData, industry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tecnologia">Tecnologia</SelectItem>
                      <SelectItem value="varejo">Varejo</SelectItem>
                      <SelectItem value="servicos">Serviços</SelectItem>
                      <SelectItem value="industria">Indústria</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Porte</Label>
                <Select
                  value={companyData.size}
                  onValueChange={(value) => setCompanyData({ ...companyData, size: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">Micro</SelectItem>
                    <SelectItem value="small">Pequeno</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
