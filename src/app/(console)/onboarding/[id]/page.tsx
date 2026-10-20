import { notFound } from "next/navigation";
import { CandidateForm } from "@/components/candidate-form";
import { SecretText } from "@/components/secret-fields";
import { Badge, ExternalLink, Facts, Notice, PageHeader, blank, candidateTone } from "@/components/ui";
import { canAccessOnboarding, candidateStatusChoices, isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getCandidate } from "@/lib/candidates";
import { chromeRemoteLabel, countryLabel, timezoneLabel } from "@/lib/constants";
import { formatDay, formatTimestamp } from "@/lib/format";
import { one } from "@/lib/utils";
import { removeCandidate, saveCandidate } from "@/server/actions";
import type { Candidate, SearchParams } from "@/lib/types";

export const metadata = { title: "Candidate" };

export default async function CandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const candidate = getCandidate(id);
  if (!candidate) notFound();
  const manager = isManager(user);
  const systemAdmin = user.isSuperAdmin;
  const canEdit = canAccessOnboarding(user);
  const query = await searchParams;

  return (
    <div>
      <PageHeader title={candidate.name} description={`${candidate.id} · Created ${formatTimestamp(candidate.createdAt)}`} />
      <Notice notice={one(query.notice)} />
      {canEdit ? (
        <CandidateForm
          action={saveCandidate}
          candidate={systemAdmin ? candidate : hideShare(candidate)}
          showShare={systemAdmin}
          statusOptions={candidateStatusChoices(user, candidate.status)}
          onDelete={manager ? removeCandidate.bind(null, candidate.id) : undefined}
        />
      ) : (
        <CandidateRead candidate={hideShare(candidate)} />
      )}
    </div>
  );
}

function hideShare(candidate: Candidate): Candidate {
  return { ...candidate, sharingPercent: null };
}

function CandidateRead({ candidate }: { candidate: ReturnType<typeof hideShare> }) {
  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Candidate</h2>
          <Badge tone={candidateTone(candidate.status)}>{candidate.status}</Badge>
        </div>
        <Facts
          items={[
            { label: "Timezone", value: timezoneLabel(candidate.timezone) },
            { label: "Email", value: blank(candidate.email) },
            { label: "Email password", value: <SecretText value={candidate.emailPassword} /> },
            { label: "Email Forwarding", value: candidate.emailForwarding ? "Yes" : "No" },
            { label: "Account password", value: <SecretText value={candidate.accountPassword} /> },
            { label: "WhatsApp", value: blank(candidate.whatsapp) },
            { label: "Telegram", value: blank(candidate.telegram) },
            { label: "Laptop Status", value: blank(candidate.laptopStatus) },
            { label: "Phone", value: blank(candidate.phone) },
          ]}
        />
        <h3 className="mb-3 mt-6 text-sm font-semibold">Remote access</h3>
        <Facts
          items={[
            { label: "Chrome Remote Desktop", value: chromeRemoteLabel(candidate.chromeRemote) },
            { label: "AnyDesk ID", value: blank(candidate.anydeskId) },
            { label: "AnyDesk password", value: <SecretText value={candidate.anydeskPassword} /> },
            { label: "UltraViewer ID", value: blank(candidate.ultraviewerId) },
            { label: "UltraViewer password", value: <SecretText value={candidate.ultraviewerPassword} /> },
          ]}
        />
        <h3 className="mb-3 mt-6 text-sm font-semibold">Client profile</h3>
        <Facts
          items={[
            { label: "Date of birth", value: candidate.dob ? formatDay(candidate.dob) : "—" },
            { label: "Gender", value: blank(candidate.gender) },
            { label: "Race", value: blank(candidate.race) },
            { label: "Country", value: countryLabel(candidate.country) },
            { label: "Address", value: blank(candidate.address) },
            { label: "LinkedIn", value: candidate.linkedinUrl ? <ExternalLink href={candidate.linkedinUrl} /> : "—" },
            { label: "Resume", value: candidate.resumeUrl ? <ExternalLink href={candidate.resumeUrl} /> : "—" },
          ]}
        />
      </section>
    </div>
  );
}
