import { useGetAnalyticsOverview } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, QrCode, Gift, ShieldAlert, Download, Contact } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import Mascot from "@/components/brand/mascot";
import { fadeUp } from "@/lib/motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardOverview() {
  const [, navigate] = useLocation();
  const { data: analytics, isLoading } = useGetAnalyticsOverview();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <motion.div className="space-y-8" variants={fadeUp} initial="initial" animate="animate">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Mascot role="admin" size="md" float />
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
      </div>

      {analytics.fraudAlertsToday > 0 && (
        <Card className="border-l-4 border-l-destructive bg-destructive/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">
                  {analytics.fraudAlertsToday} fraud alert{analytics.fraudAlertsToday !== 1 ? "s" : ""} today
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Review blocked scans and take action if needed.
                </p>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => navigate("/fraud")}>
              Review Fraud Events
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalClients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">+{analytics.newClientsThisWeek} this week</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scans Today</CardTitle>
            <QrCode className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.scansToday.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.scansThisWeek} total this week</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent-foreground shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Rewards</CardTitle>
            <Gift className="h-4 w-4 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.rewardsPending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Waiting to be claimed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fraud Alerts</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.fraudAlertsToday.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Blocked scans today</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate("/scans")}>
          <QrCode className="h-4 w-4 mr-2" />View Scan Log
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/contacts")}>
          <Contact className="h-4 w-4 mr-2" />Export Contacts
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/rewards")}>
          <Gift className="h-4 w-4 mr-2" />View Rewards
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/fraud")}>
          <ShieldAlert className="h-4 w-4 mr-2" />Fraud Events
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Daily Scans (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyScans} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    labelFormatter={(val) => new Date(val).toLocaleDateString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Daily Enrolments (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyEnrolments} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    labelFormatter={(val) => new Date(val).toLocaleDateString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "hsl(var(--secondary))", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
