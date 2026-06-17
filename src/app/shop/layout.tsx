import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "المتجر",
  description: "تسوقي حقائب، ساعات، إكسسوارات ونظارات شمسية من Flora Style مع فلترة بالماركة."
};

export default function ShopLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
