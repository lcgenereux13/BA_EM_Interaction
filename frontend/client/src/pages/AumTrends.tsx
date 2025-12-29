import { Helmet } from "react-helmet";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Header } from "@/components/Header";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const aumData = [
  { year: "2015", equity: 320, fixedIncome: 260, realAssets: 110, alternatives: 75, cash: 40 },
  { year: "2016", equity: 345, fixedIncome: 270, realAssets: 118, alternatives: 82, cash: 42 },
  { year: "2017", equity: 390, fixedIncome: 285, realAssets: 125, alternatives: 92, cash: 44 },
  { year: "2018", equity: 410, fixedIncome: 295, realAssets: 130, alternatives: 105, cash: 45 },
  { year: "2019", equity: 460, fixedIncome: 315, realAssets: 142, alternatives: 118, cash: 47 },
  { year: "2020", equity: 495, fixedIncome: 340, realAssets: 150, alternatives: 132, cash: 55 },
  { year: "2021", equity: 560, fixedIncome: 365, realAssets: 165, alternatives: 155, cash: 58 },
  { year: "2022", equity: 585, fixedIncome: 392, realAssets: 178, alternatives: 170, cash: 60 },
  { year: "2023", equity: 640, fixedIncome: 420, realAssets: 192, alternatives: 188, cash: 62 },
  { year: "2024", equity: 700, fixedIncome: 450, realAssets: 210, alternatives: 205, cash: 65 },
];

const chartConfig = {
  equity: { label: "Public Equity", color: "hsl(221 83% 53%)" },
  fixedIncome: { label: "Fixed Income", color: "hsl(199 89% 48%)" },
  realAssets: { label: "Real Assets", color: "hsl(142 69% 45%)" },
  alternatives: { label: "Alternatives", color: "hsl(262 83% 58%)" },
  cash: { label: "Liquidity", color: "hsl(24 95% 53%)" },
};

const reports = [
  { year: "2024", href: "https://example.com/annual-reports/2024.pdf" },
  { year: "2023", href: "https://example.com/annual-reports/2023.pdf" },
  { year: "2022", href: "https://example.com/annual-reports/2022.pdf" },
  { year: "2021", href: "https://example.com/annual-reports/2021.pdf" },
  { year: "2020", href: "https://example.com/annual-reports/2020.pdf" },
  { year: "2019", href: "https://example.com/annual-reports/2019.pdf" },
  { year: "2018", href: "https://example.com/annual-reports/2018.pdf" },
  { year: "2017", href: "https://example.com/annual-reports/2017.pdf" },
  { year: "2016", href: "https://example.com/annual-reports/2016.pdf" },
  { year: "2015", href: "https://example.com/annual-reports/2015.pdf" },
];

const formatBillions = (value: number) => `$${value.toLocaleString()}B`;

const sumYear = (year: typeof aumData[number]) =>
  year.equity + year.fixedIncome + year.realAssets + year.alternatives + year.cash;

export default function AumTrends() {
  const firstYear = aumData[0];
  const lastYear = aumData[aumData.length - 1];
  const totalStart = sumYear(firstYear);
  const totalEnd = sumYear(lastYear);
  const growth = ((totalEnd - totalStart) / totalStart) * 100;

  return (
    <>
      <Helmet>
        <title>10-Year AUM Trends by Asset Class</title>
        <meta
          name="description"
          content="Review 10-year AUM growth by asset class and access linked annual reports."
        />
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css"
          rel="stylesheet"
        />
      </Helmet>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-muted/20">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                Annual Allocation Review
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                10-year total AUM by asset class
              </h2>
              <p className="text-muted-foreground">
                Track how public equity, fixed income, real assets, alternatives, and liquidity
                allocations have shifted over the last decade.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Asset class growth trends</CardTitle>
                  <CardDescription>
                    Total AUM across all asset classes grew from {formatBillions(totalStart)} to{" "}
                    {formatBillions(totalEnd)} (+{growth.toFixed(1)}%).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-[360px]" config={chartConfig}>
                    <AreaChart data={aumData} margin={{ left: 8, right: 16, top: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}B`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => `FY ${value}`}
                            formatter={(value) => formatBillions(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        stackId="aum"
                        stroke="var(--color-equity)"
                        fill="var(--color-equity)"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="fixedIncome"
                        stackId="aum"
                        stroke="var(--color-fixedIncome)"
                        fill="var(--color-fixedIncome)"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="realAssets"
                        stackId="aum"
                        stroke="var(--color-realAssets)"
                        fill="var(--color-realAssets)"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="alternatives"
                        stackId="aum"
                        stroke="var(--color-alternatives)"
                        fill="var(--color-alternatives)"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="cash"
                        stackId="aum"
                        stroke="var(--color-cash)"
                        fill="var(--color-cash)"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top allocation shifts</CardTitle>
                    <CardDescription>Highlights from the last decade.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Equity allocation growth</span>
                      <span className="font-medium text-foreground">+{formatBillions(lastYear.equity - firstYear.equity)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Fixed income expansion</span>
                      <span className="font-medium text-foreground">+{formatBillions(lastYear.fixedIncome - firstYear.fixedIncome)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Alternatives momentum</span>
                      <span className="font-medium text-foreground">+{formatBillions(lastYear.alternatives - firstYear.alternatives)}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">2024 allocation mix</CardTitle>
                    <CardDescription>Share of total AUM by asset class.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {Object.entries(chartConfig).map(([key, config]) => {
                      const value = lastYear[key as keyof typeof lastYear] as number;
                      const share = (value / totalEnd) * 100;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{config.label}</span>
                          <span className="font-medium text-foreground">
                            {formatBillions(value)} ({share.toFixed(1)}%)
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Annual reports (last 10 years)</CardTitle>
                <CardDescription>
                  Download the underlying annual reports for each fiscal year.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {reports.map((report) => (
                    <a
                      key={report.year}
                      href={report.href}
                      className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-sm font-medium transition hover:border-primary/60 hover:text-primary"
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span>FY {report.year}</span>
                      <i className="ri-download-line text-base" aria-hidden />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}
