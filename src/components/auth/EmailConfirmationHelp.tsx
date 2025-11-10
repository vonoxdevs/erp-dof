import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Mail, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const EmailConfirmationHelp = () => {
  return (
    <div className="space-y-4">
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> O email pode levar até 5 minutos para chegar. Verifique também sua pasta de spam.
        </AlertDescription>
      </Alert>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Não recebi o email. O que fazer?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <p className="font-semibold">Siga este checklist:</p>
              <ul className="space-y-2 pl-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span>Verifique a pasta de <strong>Spam/Lixo eletrônico</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span>Procure por emails de <strong>noreply@mail.app.supabase.io</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span>Aguarde até 5 minutos - o email pode estar em trânsito</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span>Clique em "Reenviar email" acima se já passou 5 minutos</span>
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Como encontrar na pasta de spam?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm">
            <div className="space-y-3">
              <div>
                <p className="font-semibold mb-1">📧 Gmail:</p>
                <p>Menu lateral → "Spam" ou "Lixeira"</p>
              </div>
              <div>
                <p className="font-semibold mb-1">📧 Outlook/Hotmail:</p>
                <p>Menu lateral → "Lixo Eletrônico"</p>
              </div>
              <div>
                <p className="font-semibold mb-1">📧 Yahoo:</p>
                <p>Menu lateral → "Spam"</p>
              </div>
              <div>
                <p className="font-semibold mb-1">💡 Dica:</p>
                <p>Marque o email como "Não é spam" para receber futuros emails na caixa de entrada.</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Cliquei no link mas nada aconteceu</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <p>Se você clicou no link de confirmação mas voltou para esta tela:</p>
              <ol className="space-y-2 pl-4 list-decimal">
                <li>Aguarde alguns segundos - a verificação automática está ativa</li>
                <li>Se não funcionar, clique no botão "Já confirmei meu email" acima</li>
                <li>Se o problema persistir, tente limpar o cache do navegador</li>
              </ol>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              <span>O link expirou</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm">
            <p>Links de confirmação expiram após 24 horas por segurança.</p>
            <p>Solução: Clique no botão "Reenviar email de confirmação" acima para receber um novo link válido.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Ainda com problemas?</strong> Entre em contato com o suporte através do chat ou email: suporte@dof.com.br
        </p>
      </div>
    </div>
  );
};
