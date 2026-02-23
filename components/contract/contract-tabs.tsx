"use client";

import dynamic from "next/dynamic";
import type { AbiEvent, AbiFunction } from "viem";
import type { ChainSlug, ContractSource } from "@/types/contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FunctionList } from "@/components/contract/function-list";

function TabSkeleton() {
  return (
    <div className="space-y-3 py-4">
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}

const EventList = dynamic(
  () =>
    import("@/components/contract/event-list").then((mod) => mod.EventList),
  { loading: () => <TabSkeleton /> }
);

const SourceViewer = dynamic(
  () =>
    import("@/components/contract/source-viewer").then(
      (mod) => mod.SourceViewer
    ),
  { loading: () => <TabSkeleton /> }
);

const StorageLayout = dynamic(
  () =>
    import("@/components/contract/storage-layout").then(
      (mod) => mod.StorageLayout
    ),
  { loading: () => <TabSkeleton /> }
);

interface ContractTabsProps {
  chain: ChainSlug;
  address: string;
  readFunctions: AbiFunction[];
  events: AbiEvent[];
  source: ContractSource;
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
