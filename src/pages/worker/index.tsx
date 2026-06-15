import { useLocation } from "wouter";
import { Button, Card } from "@heroui/react";
import { useWorkerTodayScans } from "@/api";
import { QrCode, UserCircle, Star } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import Mascot from "@/components/brand/mascot";
import { fadeUp } from "@/lib/motion";

export default function WorkerHome() {
  const { user } = useAuth();
  const { data } = useWorkerTodayScans();
  const [, navigate] = useLocation();

  return (
    <motion.div className="flex-1 flex flex-col p-4 bg-muted/30" variants={fadeUp} initial="initial" animate="animate">
      <div className="mb-6 flex items-start gap-4">
        <Mascot role="employee" size="md" float />
        <div className="pt-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Hello, {user?.fullName?.split(" ")[0]}
          </h2>
          <p className="text-muted-foreground">Ready for a great shift?</p>
        </div>
      </div>

      <Card className="mb-8 p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-none shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Your Scans Today</p>
            <p className="text-4xl font-bold text-primary">{data?.count ?? 0}</p>
          </div>
          <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center">
            <Star className="h-8 w-8 text-primary" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 mt-auto mb-8">
        <Button
          size="lg"
          fullWidth
          className="h-24 text-xl rounded-2xl flex flex-col gap-2"
          onPress={() => navigate("/scan")}
        >
          <QrCode className="h-8 w-8" />
          Scan Customer Card
        </Button>

        <Button
          size="lg"
          variant="secondary"
          fullWidth
          className="h-14 text-lg rounded-2xl"
          onPress={() => navigate("/history")}
        >
          View Today&apos;s History
        </Button>

        <Button
          size="lg"
          variant="secondary"
          fullWidth
          className="h-14 text-lg rounded-2xl"
          onPress={() => navigate("/my-qr")}
        >
          <UserCircle className="h-5 w-5 mr-2" />
          Show My QR Code
        </Button>
      </div>
    </motion.div>
  );
}
