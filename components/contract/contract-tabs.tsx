"use client";

import type { Abi, AbiEvent, AbiFunction } from "viem";
import type { ChainSlug, ContractSource } from "@/types/contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FunctionList } from "@/components/contract/function-list";
import { EventList } from "@/components/contract/event-list";
import { SourceViewer } from "@/components/contract/source-viewer";
import { StorageLayout } from "@/components/contract/storage-layout";

interface ContractTabsProps {
  chain: ChainSlug;
  address: string;
  readFunctions: AbiFunction[];
  events: AbiEvent[];
  source: ContractSource;
  abi: Abi;
}

export function ContractTabs({
  chain,
  address,
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
        <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
        <TabsTrigger value="source">
          Source ({Object.keys(source.files).length} files)
        </TabsTrigger>
        <TabsTrigger value="storage">Storage</TabsTrigger>
      </TabsList>
      <TabsContent value="functions">
        <FunctionList
          functions={readFunctions}
          chain={chain}
          address={address}
        />
      </TabsContent>
      <TabsContent value="events">
        <EventList events={events} />
      </TabsContent>
      <TabsContent value="source">
        <SourceViewer source={source} />
      </TabsContent>
      <TabsContent value="storage">
        <StorageLayout entries={[]} />
      </TabsContent>
    </Tabs>
  );
}
