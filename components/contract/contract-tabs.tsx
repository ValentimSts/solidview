"use client";

import type { Abi, AbiEvent, AbiFunction } from "viem";
import type { ChainSlug, ContractSource } from "@/types/contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ContractTabsProps {
  chain: ChainSlug;
  address: string;
  readFunctions: AbiFunction[];
  events: AbiEvent[];
  source: ContractSource;
  abi: Abi;
}

export function ContractTabs({
  readFunctions,
  events,
  source,
}: ContractTabsProps) {
  return (
    <Tabs defaultValue="functions">
      <TabsList>
        <TabsTrigger value="functions">
          Read ({readFunctions.length})
        </TabsTrigger>
        <TabsTrigger value="events">
          Events ({events.length})
        </TabsTrigger>
        <TabsTrigger value="source">
          Source ({Object.keys(source.files).length} files)
        </TabsTrigger>
        <TabsTrigger value="storage">Storage</TabsTrigger>
      </TabsList>
      <TabsContent value="functions">
        <p className="text-muted-foreground">Read functions will go here.</p>
      </TabsContent>
      <TabsContent value="events">
        <p className="text-muted-foreground">Events will go here.</p>
      </TabsContent>
      <TabsContent value="source">
        <p className="text-muted-foreground">Source code will go here.</p>
      </TabsContent>
      <TabsContent value="storage">
        <p className="text-muted-foreground">Storage layout will go here.</p>
      </TabsContent>
    </Tabs>
  );
}
