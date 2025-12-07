import CS2ClusteringVizHomePage from "@/components/CS2ClusteringVizHomePage";

// Force dynamic rendering to avoid prerender issues
export const dynamic = "force-dynamic";

export default function Home() {
  return <CS2ClusteringVizHomePage />;
}
