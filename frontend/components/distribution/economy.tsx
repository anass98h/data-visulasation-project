'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const Economy = ({totalEconomy}: {totalEconomy: any}) => {
  console.log('Economy component is rendering');

  if (!totalEconomy) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CT Economy</CardTitle>
            <CardDescription>Counter-Terrorist total economy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>T Economy</CardTitle>
            <CardDescription>Terrorist total economy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>CT Economy</CardTitle>
          <CardDescription>Counter-Terrorist total economy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            ${(totalEconomy.ct_economy ?? 0).toLocaleString()}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>T Economy</CardTitle>
          <CardDescription>Terrorist total economy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            ${(totalEconomy.t_economy ?? 0).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Economy;