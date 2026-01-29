/**
 * MCP Multi-Client Configuration Component
 *
 * Accordion-based component for MCP client configurations
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { McpClientItem } from './McpClientItem'
import { MCP_CLIENTS, getAllClientIds, getComingSoonClient } from '@/lib/mcp/client-configs'

export function McpMultiClientConfig() {
  const comingSoonClient = getComingSoonClient()

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="w-full">
        {getAllClientIds().map(clientId => {
          const client = MCP_CLIENTS[clientId]

          return (
            <AccordionItem key={clientId} value={clientId}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{client?.displayName}</span>
                  {client?.description && (
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      {client.description}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <McpClientItem client={client} />
              </AccordionContent>
            </AccordionItem>
          )
        })}

        {/* Coming Soon */}
        {comingSoonClient && (
          <AccordionItem value="coming-soon">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="font-medium">{comingSoonClient.displayName}</span>
                <Badge variant="outline" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 px-1">
                <p className="text-sm text-muted-foreground">
                  {comingSoonClient.description}
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  {comingSoonClient.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
