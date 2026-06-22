import AdminAssessEvaluateClient from "./AdminAssessEvaluateClient";

type PageProps = {
  params: Promise<{
    coverId: string;
  }>;
};

export default async function AdminAssessEvaluatePage({ params }: PageProps) {
  const { coverId } = await params;
  return <AdminAssessEvaluateClient coverId={coverId} />;
}
