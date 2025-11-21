import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ReportData } from "@/services/reportService";

interface AIReportAnalysisProps {
  reportData: ReportData;
}

export function AIReportAnalysis({ reportData }: AIReportAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('analyze-report', {
        body: { reportData }
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
      toast.success("Análise IA concluída!");
    } catch (err) {
      console.error('Erro ao analisar relatório:', err);
      const errorMessage = err instanceof Error ? err.message : "Erro ao gerar análise";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 glass">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Análise com IA</h3>
            <p className="text-sm text-muted-foreground">
              Insights estratégicos gerados por inteligência artificial
            </p>
          </div>
        </div>
        <Button 
          onClick={handleAnalyze} 
          disabled={loading || !reportData.transactions.length}
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Analisar Relatório
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Erro ao gerar análise</p>
            <p className="text-sm opacity-90 mt-1">{error}</p>
          </div>
        </div>
      )}

      {analysis && (
        <div className="mt-4 prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">
            {analysis}
          </div>
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="text-center py-8 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Clique em "Analisar Relatório" para obter insights estratégicos</p>
          <p className="text-xs mt-2">A IA analisará seus dados financeiros e fornecerá recomendações personalizadas</p>
        </div>
      )}
    </Card>
  );
}
