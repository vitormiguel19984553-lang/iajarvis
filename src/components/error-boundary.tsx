import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Client-side Error Boundary. Catches render/lifecycle errors in the tree
 * below and shows a friendly recovery UI instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full text-center rounded-xl border border-border p-6 bg-sidebar">
          <div className="text-[11px] tracking-[0.2em] font-semibold text-[#00d4ff] mb-2">
            J.A.R.V.I.S · ERRO
          </div>
          <h1 className="text-xl font-semibold mb-2">Algo correu mal</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Um componente falhou. Podes tentar novamente sem perder a sessão.
          </p>
          <details className="text-left text-[11px] text-muted-foreground bg-background rounded-lg p-2 mb-4 max-h-32 overflow-auto">
            <summary className="cursor-pointer">Detalhes técnicos</summary>
            <pre className="whitespace-pre-wrap break-words mt-2">
              {this.state.error.message}
            </pre>
          </details>
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.reset}
              className="px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)] text-sm hover:bg-[rgba(0,212,255,0.16)]"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-background"
            >
              Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
