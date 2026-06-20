import { useRef, useState } from "react";

import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

import {

  Check,

  Copy,

  Download,

  ExternalLink,

  Loader2,

  QrCode,

  Smartphone,

  Users,

} from "lucide-react";

import { motion } from "framer-motion";

import { tenantClientLink, tenantEmployeeLink } from "@/lib/links";

import { downloadQrCanvas, getQrLogoSettings } from "@/lib/branded-qr";

import { useCurrentTenant } from "@/lib/tenant-context";

import { useShopBranding } from "@/hooks/use-branding";

import { PLATFORM } from "@/lib/platform";

import { useToast } from "@/hooks/use-toast";

import { staggerItem } from "@/lib/motion";



const QR_DISPLAY_SIZE = 148;

const QR_EXPORT_SIZE = 720;



function CopyButton({ value, label }: { value: string; label: string }) {

  const { toast } = useToast();

  const [copied, setCopied] = useState(false);



  const copy = async () => {

    try {

      await navigator.clipboard.writeText(value);

      setCopied(true);

      toast({ title: `${label} copié` });

      setTimeout(() => setCopied(false), 2000);

    } catch {

      toast({ title: "Impossible de copier", variant: "destructive" });

    }

  };



  return (

    <button type="button" className="dash-action-btn" onClick={() => void copy()}>

      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}

      {copied ? "Copié" : "Copier"}

    </button>

  );

}



export default function DashboardQrHub() {

  const { slug, tenant, isLoading } = useCurrentTenant();

  const branding = useShopBranding();

  const { toast } = useToast();

  const exportRef = useRef<HTMLDivElement>(null);

  const [downloading, setDownloading] = useState(false);



  if (isLoading) {

    return <div className="dash-skeleton h-72 rounded-2xl" />;

  }



  if (!slug) {

    return (

      <article className="dash-card">

        <div className="dash-card-body">

          <p className="text-sm text-[var(--dash-text-secondary)]">

            Impossible de charger les liens de votre boutique.

          </p>

        </div>

      </article>

    );

  }



  const clientLink = tenantClientLink(slug);

  const employeeLink = tenantEmployeeLink(slug);

  const shopName = tenant?.name ?? "votre boutique";

  const logoUrl = branding.logoUrl ?? PLATFORM.logoUrl;

  const displayImageSettings = getQrLogoSettings(logoUrl, QR_DISPLAY_SIZE);

  const exportImageSettings = getQrLogoSettings(logoUrl, QR_EXPORT_SIZE);



  const handleDownload = async () => {

    setDownloading(true);

    try {

      await new Promise((resolve) => setTimeout(resolve, 400));

      const canvas = exportRef.current?.querySelector("canvas");

      if (!canvas) throw new Error("Canvas unavailable");



      downloadQrCanvas(canvas, `${slug}-qr-inscription.png`);

      toast({ title: "QR code téléchargé", description: "Prêt à imprimer ou afficher." });

    } catch {

      toast({

        title: "Échec du téléchargement",

        description: "Réessayez dans un instant.",

        variant: "destructive",

      });

    } finally {

      setDownloading(false);

    }

  };



  return (

    <motion.article className="dash-card dash-qr-hub" variants={staggerItem}>

      <div className="dash-card-header">

        <div className="flex items-start gap-3">

          <div className="dash-qr-hub-icon">

            <QrCode className="h-5 w-5" />

          </div>

          <div>

            <h2 className="dash-card-title">QR inscription clients</h2>

            <p className="dash-section-desc">

              Affichez ce code au comptoir pour que vos clients créent leur carte chez{" "}

              <span className="font-medium text-[var(--dash-text)]">{shopName}</span>.

            </p>

          </div>

        </div>

      </div>



      <div className="dash-card-body dash-qr-hub-body">

        <div className="dash-qr-hub-layout">

          <div className="dash-qr-hub-code">

            <div className="dash-qr-frame">

              <QRCodeSVG

                value={clientLink}

                size={QR_DISPLAY_SIZE}

                level="H"

                marginSize={1}

                imageSettings={displayImageSettings}

              />

            </div>

            <p className="dash-qr-hint">Scannez pour s&apos;inscrire</p>

          </div>



          <div className="dash-qr-hub-links">

            <div className="dash-qr-link-block">

              <p className="dash-qr-link-label">

                <Smartphone className="h-4 w-4" />

                Lien clients

              </p>

              <p className="dash-qr-url">{clientLink}</p>

              <div className="dash-qr-link-actions">

                <CopyButton value={clientLink} label="Lien clients" />

                <a

                  href={clientLink}

                  target="_blank"

                  rel="noopener noreferrer"

                  className="dash-action-btn no-underline"

                >

                  <ExternalLink className="h-4 w-4" />

                  Ouvrir

                </a>

              </div>

            </div>



            <div className="dash-qr-divider" />



            <div className="dash-qr-link-block">

              <p className="dash-qr-link-label">

                <Users className="h-4 w-4" />

                Connexion employés

              </p>

              <p className="dash-qr-url">{employeeLink}</p>

              <div className="dash-qr-link-actions">

                <CopyButton value={employeeLink} label="Lien employés" />

                <a

                  href={employeeLink}

                  target="_blank"

                  rel="noopener noreferrer"

                  className="dash-action-btn no-underline"

                >

                  <ExternalLink className="h-4 w-4" />

                  Ouvrir

                </a>

              </div>

            </div>

          </div>

        </div>



        <button

          type="button"

          className="dash-btn-secondary dash-qr-download-btn"

          onClick={() => void handleDownload()}

          disabled={downloading}

        >

          {downloading ? (

            <Loader2 className="h-4 w-4 animate-spin" />

          ) : (

            <Download className="h-4 w-4" />

          )}

          Télécharger le QR code

        </button>

      </div>



      <div ref={exportRef} className="dash-qr-export-hidden" aria-hidden>

        <QRCodeCanvas

          value={clientLink}

          size={QR_EXPORT_SIZE}

          level="H"

          marginSize={2}

          imageSettings={exportImageSettings}

        />

      </div>

    </motion.article>

  );

}

