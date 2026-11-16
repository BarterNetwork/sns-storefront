import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "T-Shirt Depot & More | Wholesale Apparel",
  description:
    "Premium wholesale activewear and custom t-shirts, priced in Barter Bucks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=Oswald:wght@400;600&family=Anton&family=Black+Ops+One&family=Righteous&family=Pacifico&family=Dancing+Script:wght@700&family=Great+Vibes&family=Lobster&family=Satisfy&family=Permanent+Marker&family=Rock+Salt&family=Montserrat:wght@400;700&family=Raleway:wght@400;700&family=Poppins:wght@400;700&family=Playfair+Display:wght@700&family=Abril+Fatface&family=Alfa+Slab+One&family=Creepster&family=Boogaloo&family=Fredericka+the+Great&family=Russo+One&family=Teko:wght@600&family=Orbitron:wght@700&display=swap"
          rel="stylesheet"
        />
        <meta name="facebook-domain-verification" content="dgks0x65cipiwfkol78wzthzxexvq2" />
        <meta name="facebook-domain-verification" content="mqpxeezrme66boz13z22trmw1lgg10" />
        {/* Meta Pixel */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '231835949846728');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=231835949846728&ev=PageView&noscript=1" />`,
          }}
        />
      </head>
      <body data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false">
        <div style={{background:"#0b0b0f",borderBottom:"1px solid #1a1a1a",padding:"0.45rem 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"1rem"}}>
          <a href="https://barternetworkokc.com" style={{color:"#D4AF37",textDecoration:"none",fontSize:"0.78rem",fontFamily:"'DM Sans',sans-serif",fontWeight:600,letterSpacing:"0.03em"}}>
            ← Barter Network
          </a>
          <span style={{color:"#555",fontSize:"0.72rem",fontFamily:"'DM Sans',sans-serif"}}>Powered by Barter Network OKC</span>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
