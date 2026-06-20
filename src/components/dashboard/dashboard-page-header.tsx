import { motion } from "framer-motion";
import { headerItem, headerStagger } from "@/lib/motion";

type DashboardPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function DashboardPageHeader({ eyebrow, title, description, action }: DashboardPageHeaderProps) {
  return (
    <motion.header
      className="dash-page-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      variants={headerStagger}
      initial="initial"
      animate="animate"
    >
      <div>
        {eyebrow && (
          <motion.p className="dash-page-eyebrow" variants={headerItem}>
            {eyebrow}
          </motion.p>
        )}
        <motion.h1 className="dash-page-title" variants={headerItem}>
          {title}
        </motion.h1>
        {description && (
          <motion.p className="dash-page-desc" variants={headerItem}>
            {description}
          </motion.p>
        )}
      </div>
      {action && <motion.div variants={headerItem}>{action}</motion.div>}
    </motion.header>
  );
}
