import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scrollwise — questions from your shelf",
  description: "A curiosity feed from your bookshelf.",
};

export default function Feed2Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="feed2">
      <link
        rel="stylesheet"
        precedence="default"
        href="https://api.fontshare.com/v2/css?f[]=clash-display@600&f[]=erode@400,400i&f[]=general-sans@500,700&display=swap"
      />
      {children}
    </div>
  );
}
