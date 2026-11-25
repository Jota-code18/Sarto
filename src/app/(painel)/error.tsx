"use client";
import { useEffect } from "react";
import { avisarErro } from "@/componentes/erro";
import { ErroTela } from "@/componentes/moldura";

export default function Erro({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => avisarErro(error), [error]);
  return <ErroTela onRepetir={reset} />;
}
