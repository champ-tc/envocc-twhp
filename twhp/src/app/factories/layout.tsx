import FactoryLayout from "@/components/FactoryLayout";

export default function FactoriesRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FactoryLayout>{children}</FactoryLayout>;
}
