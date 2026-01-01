import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Zap, DollarSign, Brain } from "lucide-react";

export interface ModelOption {
  value: string;
  label: string;
  description: string;
  cost: string; // Custo por 1M tokens
  speed: "fast" | "medium" | "slow";
  power: "high" | "medium" | "low";
  recommended?: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    value: "gpt-4o",
    label: "GPT-4o",
    description: "Modelo mais poderoso e preciso, ideal para tarefas complexas",
    cost: "R$ 0,15 / 1M tokens",
    speed: "fast",
    power: "high",
    recommended: true,
  },
  {
    value: "gpt-4.1",
    label: "GPT-4.1",
    description: "Versão aprimorada do GPT-4o com melhorias de performance",
    cost: "R$ 0,20 / 1M tokens",
    speed: "fast",
    power: "high",
    recommended: true,
  },
  {
    value: "gpt-4.1-mini",
    label: "GPT-4.1 Mini",
    description: "Versão compacta do GPT-4.1, balanceada e eficiente",
    cost: "R$ 0,015 / 1M tokens",
    speed: "fast",
    power: "medium",
    recommended: true,
  },
  {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    description: "Balanceado entre custo e qualidade, recomendado para uso geral",
    cost: "R$ 0,01 / 1M tokens",
    speed: "fast",
    power: "medium",
  },
  {
    value: "gpt-5",
    label: "GPT-5",
    description: "Modelo de última geração com capacidades avançadas",
    cost: "R$ 0,25 / 1M tokens",
    speed: "fast",
    power: "high",
    recommended: true,
  },
  {
    value: "gpt-5-mini",
    label: "GPT-5 Mini",
    description: "Versão compacta do GPT-5, ideal para uso em escala",
    cost: "R$ 0,02 / 1M tokens",
    speed: "fast",
    power: "medium",
  },
  {
    value: "gpt-5.2",
    label: "GPT-5.2",
    description: "Versão mais recente do GPT-5 com melhorias significativas",
    cost: "R$ 0,30 / 1M tokens",
    speed: "fast",
    power: "high",
    recommended: true,
  },
  {
    value: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    description: "Versão anterior do GPT-4, ainda muito capaz",
    cost: "R$ 0,10 / 1M tokens",
    speed: "medium",
    power: "high",
  },
  {
    value: "gpt-3.5-turbo",
    label: "GPT-3.5 Turbo",
    description: "Mais econômico, adequado para tarefas simples",
    cost: "R$ 0,005 / 1M tokens",
    speed: "fast",
    power: "low",
  },
];

interface ModelSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const selectedModel = AVAILABLE_MODELS.find((m) => m.value === value) || AVAILABLE_MODELS[1]; // Default: gpt-4o-mini

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case "fast":
        return <Zap className="h-3 w-3 text-green-500" />;
      case "medium":
        return <Zap className="h-3 w-3 text-yellow-500" />;
      default:
        return <Zap className="h-3 w-3 text-gray-400" />;
    }
  };

  const getPowerIcon = (power: string) => {
    switch (power) {
      case "high":
        return <Brain className="h-3 w-3 text-purple-500" />;
      case "medium":
        return <Brain className="h-3 w-3 text-blue-500" />;
      default:
        return <Brain className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="model">Modelo de IA</Label>
        <Select value={value || "gpt-4o-mini"} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id="model" className="w-full">
            <SelectValue placeholder="Selecione um modelo" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                <div className="flex items-center gap-2">
                  <span>{model.label}</span>
                  {model.recommended && (
                    <Badge variant="secondary" className="text-xs">
                      Recomendado
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Card com informações do modelo selecionado */}
      <Card className="border-primary/20 bg-muted/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {selectedModel.label}
              {selectedModel.recommended && (
                <Badge variant="default" className="ml-2">
                  Recomendado
                </Badge>
              )}
            </CardTitle>
          </div>
          <CardDescription className="text-sm mt-1">
            {selectedModel.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {getSpeedIcon(selectedModel.speed)}
              <div>
                <p className="text-xs text-muted-foreground">Velocidade</p>
                <p className="text-sm font-medium capitalize">{selectedModel.speed}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getPowerIcon(selectedModel.power)}
              <div>
                <p className="text-xs text-muted-foreground">Capacidade</p>
                <p className="text-sm font-medium capitalize">{selectedModel.power}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <DollarSign className="h-3 w-3 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Custo estimado</p>
                <p className="text-sm font-medium">{selectedModel.cost}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

