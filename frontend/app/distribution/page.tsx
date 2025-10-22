'use client';

import Economy from "@/components/distribution/economy";
import { useEffect, useState } from "react";
import * as dataHelpers from "@/lib/dataHelpers";
import * as distributionHelpers from "@/lib/distribution";
import {economyDropdown} from "@/components/distribution/dropdown"
import { LineChart } from "lucide-react";

export default function Home() {
  console.log("🚀 Distribution page is rendering on server!");
  console.log("Rendering Economy Component");
 
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dropdownValue, setDropdownValue] = useState<string>('ct');
  const EconomyComponent = Economy as any;

  let economyData: Record<string, any> = {};
  let roundsData: any[] = [];


  // will load every time when the page refresh
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

    const oneDemoDataset = fetchData();

    //2. extract the rounds
     roundsData = dataHelpers.extractFeatures(oneDemoDataset, ['rounds']);
    //3. calculate economy
      economyData = distributionHelpers.calculateEconomy(roundsData);

  }, []);

  //will be invoked when the data is changed
  useEffect(() => {
    console.log("Dropdown value changed:", dropdownValue);
    // when the dropdown value changes, we will render different side's economy

    
  }, [dropdownValue]);

  return <>
  <EconomyComponent dataset={data} />
  <div>

    <economyDropdown />
    <Economy />
    <LineChart rounddata={roundsData}/>
    <div>here will be a line chart and the x axes will be rounds and y axes will be money, each round number will be a data point</div>
  </div>
  </>;
}
