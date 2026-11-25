"use client";
import { useEffect } from "react";
import { avisarErro } from "@/componentes/erro";

export default function ErroGeral({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => avisarErro(error), [error]);
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center" }}>
        <p>O painel falhou ao abrir. Os dados continuam salvos neste navegador.</p>
        <button type="button" onClick={reset}>
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
