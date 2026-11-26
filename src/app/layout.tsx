import type { Metadata } from "next";
import { Figtree, Inter_Tight, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieConsent from "@/components/CookieConsent";
import ShellFrame from "@/components/shell/ShellFrame";
import SiteFooter from "@/components/shell/SiteFooter";
import type { HeaderUser } from "@/components/shell/TopBar";
import { displayName, getSession } from "@/lib/auth";
import "./globals.css";

const displayFont = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const labelFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-label",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.plainterms.us";
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const googleSiteVerification =
  process.env.GOOGLE_SITE_VERIFICATION ?? process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PlainTerms",
    template: "%s | PlainTerms",
  },
  description:
    "Contracts, leases, bids and the letters that come after them, explained in plain English.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PlainTerms",
    title: "PlainTerms",
    description:
      "Contracts, leases, bids and the letters that come after them, explained in plain English.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlainTerms",
    description:
      "Contracts, leases, bids and the letters that come after them, explained in plain English.",
  },
  ...(googleSiteVerification
    ? {
        verification: {
          google: googleSiteVerification,
        },
      }
    : {}),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const headerUser: HeaderUser | null = session
    ? {
        name: displayName(session.user),
        email: session.user.email,
        pictureUrl: session.user.profilePictureUrl,
      }
    : null;

  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} ${labelFont.variable} pt-body antialiased`}>
        {gaMeasurementId ? (
          <>
            {/* Consent defaults must run before Google's tag loads. */}
            <Script id="google-analytics" strategy="beforeInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('consent', 'default', {
                  analytics_storage: 'denied',
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied',
                  wait_for_update: 500,
                });
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', { send_page_view: false });
              `}
            </Script>
            <Script id="google-analytics-tag" strategy="lazyOnload" src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} />
            <Suspense fallback={null}>
              <GoogleAnalytics measurementId={gaMeasurementId} />
            </Suspense>
          </>
        ) : null}
        {clarityProjectId ? (
          <Script id="ms-clarity" strategy="lazyOnload">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityProjectId}");`}
          </Script>
        ) : null}
        {metaPixelId ? (
          <Script id="meta-pixel" strategy="lazyOnload">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
          </Script>
        ) : null}
        <ShellFrame user={headerUser} footer={<SiteFooter />}>
          {children}
        </ShellFrame>
        <CookieConsent />
      </body>
    </html>
  );
}
