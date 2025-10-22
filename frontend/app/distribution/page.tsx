'use client';

import Economy from "@/components/distribution/economy";
import { useEffect, useState } from "react";
import * as dataHelpers from "@/lib/dataHelpers";

export default function Home() {
  console.log("🚀 Distribution page is rendering on server!");
  console.log("Rendering Economy Component");
 
  const [data, setData] = useState<any>(null);
  const EconomyComponent = Economy as any;

  useEffect(() => {

    console.log("Rendering Economy Component (client)");
    const fetchData = async () => {
      try {
        const loaded = await dataHelpers.loadMatchData('file');
        console.log("Loaded match data:", loaded);
        setData(loaded);
      } catch (error) {
        console.error("Error loading match data:", error);
      }
    };

    fetchData();
  }, []);

  return <EconomyComponent dataset={data} />;
}
