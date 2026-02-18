import type { AbiEvent } from "viem";
import { toEventSignature, toEventHash } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EventListProps {
  events: AbiEvent[];
}

export function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No events found.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {events.map((event) => {
        const signature = toEventSignature(event);
        const hash = toEventHash(event);

        return (
          <Card key={`${event.name}(${event.inputs.map(i => i.type).join(',')})`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-mono">
                {event.name}
              </CardTitle>
              <p className="font-mono text-xs text-muted-foreground break-all">
                {signature}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {event.inputs.map((input, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-mono">{input.type}</span>
                    <span className="text-muted-foreground">
                      {input.name || `param${i}`}
                    </span>
                    {input.indexed && (
                      <Badge variant="outline" className="text-xs">
                        indexed
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 font-mono text-xs text-muted-foreground break-all">
                Topic 0: {hash}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
