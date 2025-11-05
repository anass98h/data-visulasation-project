import CS2ClusteringViz from "@/components/CS2ClusteringViz";

// Force dynamic rendering to avoid prerender issues
export const dynamic = 'force-dynamic';

export default function Home() {
  return <CS2ClusteringViz />;
}
