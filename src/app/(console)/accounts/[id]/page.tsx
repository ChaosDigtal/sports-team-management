import { notFound } from "next/navigation";
import { AccountForm } from "@/components/account-form";
import { SecretText } from "@/components/secret-fields";
import { AccessNote, Badge, ExternalLink, Facts, Notice, PageHeader, accountTone, blank } from "@/components/ui";
import { isManager } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { chromeRemoteLabel, countryLabel, timezoneLabel } from "@/lib/constants";
import { formatDay, formatHours, formatTimestamp, formatWhen, formatWithdrawalSchedule } from "@/lib/format";
import { getAccount, userWorksOnAccount } from "@/lib/queries";
import { toDatetimeLocalValue } from "@/lib/time";
import { one } from "@/lib/utils";
import { removeAccount, saveAccount } from "@/server/actions";
import type { Account, SearchParams } from "@/lib/types";

export const metadata = { title: "Account" };

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const account = getAccount(id);
  if (!account) notFound();
  const manager = isManager(user);
  if (!manager && !userWorksOnAccount(user.id, id)) {
    return <AccessNote title="Outside your accounts" body="This account is not on your logged tasks." />;
  }
  const query = await searchParams;

  return (
    <div>
      <PageHeader title={account.name} description={`${account.id} · Created ${formatTimestamp(account.createdAt)}`} />
      <Notice notice={one(query.notice)} />
      {manager ? (
        <AccountForm
          action={saveAccount}
          account={account}
          suspendedLocal={account.suspendedAt ? toDatetimeLocalValue(account.suspendedAt, account.timezone) : ""}
          onDelete={removeAccount.bind(null, account.id)}
        />
      ) : (
        <AccountRead account={visibleAccount(account)} />
      )}
    </div>
  );
}

function visibleAccount(account: Account) {
  const { sharingPercent: _sharingPercent, ...rest } = account;
  return rest;
}

function AccountRead({ account }: { account: ReturnType<typeof visibleAccount> }) {
  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Account</h2>
          <Badge tone={accountTone(account.status)}>{account.status}</Badge>
        </div>
        <Facts
          items={[
            { label: "Weekly Target Work Hours", value: formatHours(account.weeklyTargetHours) },
            { label: "Timezone", value: timezoneLabel(account.timezone) },
            { label: "Scheduled withdrawal", value: formatWithdrawalSchedule(account.withdrawalWeekday, account.withdrawalMinutes) },
            { label: "Email", value: blank(account.email) },
            { label: "Email password", value: <SecretText value={account.emailPassword} /> },
            { label: "Account password", value: <SecretText value={account.accountPassword} /> },
            { label: "WhatsApp", value: blank(account.whatsapp) },
            { label: "Phone", value: blank(account.phone) },
            { label: "Suspended at", value: account.suspendedAt ? formatWhen(account.suspendedAt, account.timezone) : "—" },
          ]}
        />
        <h3 className="mb-3 mt-6 text-sm font-semibold">AI Datatrainer Account</h3>
        <Facts
          items={[
            { label: "Email", value: blank(account.trainerEmail) },
            { label: "Password", value: <SecretText value={account.trainerPassword} /> },
            { label: "Bitwarden email", value: blank(account.bitwardenEmail) },
            { label: "Bitwarden master password", value: <SecretText value={account.bitwardenPassword} /> },
          ]}
        />
      </section>
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold">Remote access</h2>
        <Facts
          items={[
            { label: "Chrome Remote Desktop", value: chromeRemoteLabel(account.chromeRemote) },
            { label: "AnyDesk ID", value: blank(account.anydeskId) },
            { label: "AnyDesk password", value: <SecretText value={account.anydeskPassword} /> },
            { label: "UltraViewer ID", value: blank(account.ultraviewerId) },
            { label: "UltraViewer password", value: <SecretText value={account.ultraviewerPassword} /> },
          ]}
        />
      </section>
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold">Client profile</h2>
        <Facts
          items={[
            { label: "Date of birth", value: account.dob ? formatDay(account.dob) : "—" },
            { label: "Gender", value: blank(account.gender) },
            { label: "Race", value: blank(account.race) },
            { label: "Country", value: account.country ? countryLabel(account.country) : "—" },
            { label: "Address", value: blank(account.address) },
            { label: "LinkedIn", value: <ExternalLink href={account.linkedinUrl} /> },
            { label: "Resume", value: <ExternalLink href={account.resumeUrl} /> },
          ]}
        />
      </section>
    </div>
  );
}
