import { AddressInput } from "@/components/address-input";
import { RecentSearches } from "@/components/recent-searches";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Solidview</h1>
        <p className="text-lg text-muted-foreground">
          Explore, understand, and interact with any verified smart contract.
        </p>
      </div>
      <AddressInput />
      <RecentSearches />
    </main>
  );
}
