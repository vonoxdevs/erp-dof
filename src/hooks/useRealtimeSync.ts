import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para sincronizar dados em tempo real com o Supabase
 * Invalida automaticamente as queries quando houver mudanças nas tabelas
 */
export function useRealtimeSync(tables: string[], queryKeys: string[][]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel(`realtime-sync-${tables.join('-')}`);

    // Adicionar listener para cada tabela
    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`🔄 Mudança detectada na tabela ${table}:`, payload.eventType);
          
          // Invalidar todas as queries relacionadas
          queryKeys.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Sincronização em tempo real ativada para: ${tables.join(', ')}`);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables, queryKeys, queryClient]);
}
