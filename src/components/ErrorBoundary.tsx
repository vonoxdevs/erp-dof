import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleCopyError = () => {
    const errorDetails = this.getErrorDetails();
    navigator.clipboard.writeText(errorDetails);
    toast.success('Detalhes do erro copiados!');
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  getErrorDetails = () => {
    const { error, errorInfo } = this.state;
    const timestamp = new Date().toISOString();
    const userAgent = navigator.userAgent;
    const url = window.location.href;
    
    return `
=== ERRO NO APLICATIVO ===
Data/Hora: ${timestamp}
URL: ${url}
Navegador: ${userAgent}

=== ERRO ===
${error?.name || 'Unknown'}: ${error?.message || 'No message'}

=== STACK TRACE ===
${error?.stack || 'No stack trace'}

=== COMPONENT STACK ===
${errorInfo?.componentStack || 'No component stack'}
    `.trim();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, showDetails } = this.state;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-8 w-8" />
              <h1 className="text-xl font-semibold">Algo deu errado</h1>
            </div>
            
            <p className="text-muted-foreground">
              Ocorreu um erro inesperado. Por favor, tente recarregar a página ou voltar ao início.
            </p>

            {error && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.toggleDetails}
                  className="w-full justify-between text-muted-foreground"
                >
                  <span>Ver detalhes do erro</span>
                  {showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {showDetails && (
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded space-y-2 max-h-48 overflow-auto">
                    <p className="font-medium text-destructive">{error.name}: {error.message}</p>
                    <pre className="whitespace-pre-wrap break-words text-[10px]">
                      {error.stack?.split('\n').slice(0, 5).join('\n')}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={this.handleCopyError}
                      className="w-full mt-2"
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Copiar detalhes completos
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={this.handleReload} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Ir ao Início
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
