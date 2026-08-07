import "../src/index.css";
import Providers from "./providers";

export const metadata = {
  title: "CareTrack",
  description: "Doctor follow-up CRM",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Providers />
      </body>
    </html>
  );
}
