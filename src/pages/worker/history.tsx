import { Link, useLocation } from "wouter";
import { Button, Card, Chip } from "@heroui/react";
import { useWorkerTodayScans } from "@/api";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { ArrowLeft, CheckCircle2, Phone, XCircle } from "lucide-react";

export default function WorkerHistory() {
  const { data, isLoading } = useWorkerTodayScans();
  const [, navigate] = useLocation();

  return (
    <motion.div
      className="flex flex-col h-full p-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
        <Link href="/" className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold">Today&apos;s Scans</h2>
          <p className="text-sm text-muted-foreground">{data?.count ?? 0} scans today</p>
        </div>
      </motion.div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Loading…</p>
      ) : !data?.scans.length ? (
        <Card className="p-8 text-center flex-1 flex items-center justify-center">
          <div>
            <p className="text-muted-foreground mb-4">No scans yet today.</p>
            <Button onPress={() => navigate("/scan")}>Start Scanning</Button>
          </div>
        </Card>
      ) : (
        <motion.div className="space-y-3 flex-1 overflow-y-auto pb-4" variants={staggerContainer}>
          {data.scans.map((scan) => (
            <motion.div key={scan.id} variants={fadeUp}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{scan.clientName}</p>
                    {scan.clientPhone && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" aria-hidden />
                        {scan.clientPhone}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(scan.scannedAt).toLocaleTimeString()}
                    </p>
                    {scan.blockReasonLabel && (
                      <p className="text-xs text-red-600 mt-1">{scan.blockReasonLabel}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {scan.status === "approved" ? (
                      <Chip size="sm" color="success">
                        <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                        +{scan.stampsAdded} stamp
                      </Chip>
                    ) : (
                      <Chip size="sm" color="danger">
                        <XCircle className="h-3 w-3 mr-1 inline" />
                        Blocked
                      </Chip>
                    )}
                    {scan.rewardTriggered && <Chip size="sm" color="warning">Reward!</Chip>}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
