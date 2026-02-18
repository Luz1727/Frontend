import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("UI crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
          <h2 style={{ margin: 0 }}>Ocurrió un error en la interfaz</h2>
          <p style={{ marginTop: 10 }}>
            Revisa la consola. Este panel evita que la pantalla quede en blanco.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 12, borderRadius: 8 }}>
            {String(this.state.error?.message || this.state.error || "Error desconocido")}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
