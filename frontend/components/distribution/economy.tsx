'use client';

// todo:
const Economy = ({totalEconomy}: {totalEconomy: any}) => {
  console.log('Economy component is rendering');

  if (!totalEconomy) {
    return <div>Loading economy data...</div>;
  }

  return <div>
    <div>total:economy</div>
    <div>CT Economy: {totalEconomy.ct_economy ?? 0}</div>
    <div>T Economy: {totalEconomy.t_economy ?? 0}</div>
  </div>;
};

export default Economy;