import { useMutation } from "@tanstack/react-query";
import {
  generateCardDesignWithGroq,
  type AiCardDesignInput,
  type AiCardDesignResult,
} from "@/lib/card-ai-groq";

export type { AiCardDesignInput, AiCardDesignResult };

export function useAiCardDesign() {
  return useMutation({
    mutationFn: generateCardDesignWithGroq,
  });
}
