import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
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

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-8 w-8" />
              <h1 className="text-xl font-semibold">Algo deu errado</h1>
            </div>
            
            <p className="text-muted-foreground">
              Ocorreu um erro inesperado. Por favor, tente recarregar a página ou voltar ao início.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs text-muted-foreground bg-muted p-2 rounded">
                <summary className="cursor-pointer font-medium">Detalhes do erro</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
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
