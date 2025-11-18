import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { getHistoricalReports } from "@/services/reportService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatInSaoPauloTZ } from "@/lib/dateUtils";

export function HistoricalReportsDialog() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    const data = await getHistoricalReports();
    setReports(data);
    setLoading(false);
  };

  const downloadReport = async (fileUrl: string, reportId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('financial-reports')
        .download(fileUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Relatório baixado com sucesso!");
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error("Erro ao baixar relatório");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={loadReports}>
          <FileText className="w-4 h-4 mr-2" />
          Ver Relatórios Anteriores
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Relatórios Gerados</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum relatório gerado ainda
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Gerado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map(report => (
                <TableRow key={report.id}>
                  <TableCell>
                    {formatInSaoPauloTZ(report.period_start, 'dd/MM/yyyy')} - {formatInSaoPauloTZ(report.period_end, 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="capitalize">{report.report_type}</TableCell>
                  <TableCell>{formatInSaoPauloTZ(report.created_at, 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => downloadReport(report.file_url, report.id)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
