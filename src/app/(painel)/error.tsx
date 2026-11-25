"use client";
import { ErroTela } from "@/componentes/moldura";

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return <ErroTela onRepetir={reset} />;
}
