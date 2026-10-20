type ActiveFields = {
  name: string;
  email: string;
  whatsapp: string;
  telegram: string;
  chromeRemote: string;
  anydeskId: string;
  anydeskPassword: string;
  ultraviewerId: string;
  ultraviewerPassword: string;
  dob: string;
  gender: string;
  race: string;
  country: string;
  linkedinUrl: string;
  resumeUrl: string;
};

export function activeCandidateWarning(fields: ActiveFields) {
  const missing: string[] = [];
  if (!fields.name.trim()) missing.push("Name");
  if (!fields.email.trim()) missing.push("Email");
  if (!fields.whatsapp.trim() && !fields.telegram.trim()) missing.push("WhatsApp or Telegram");
  const chrome = fields.chromeRemote.trim();
  const anydesk = Boolean(fields.anydeskId.trim() && fields.anydeskPassword.trim());
  const ultraviewer = Boolean(fields.ultraviewerId.trim() && fields.ultraviewerPassword.trim());
  if (!chrome && !anydesk && !ultraviewer) missing.push("Chrome Remote Desktop, AnyDesk, or UltraViewer");
  if (!fields.dob.trim()) missing.push("Date of birth");
  if (!fields.gender.trim()) missing.push("Gender");
  if (!fields.race.trim()) missing.push("Race");
  if (!fields.country.trim()) missing.push("Country");
  if (!fields.linkedinUrl.trim()) missing.push("LinkedIn");
  if (!fields.resumeUrl.trim()) missing.push("Resume");
  if (!missing.length) return null;
  return `Can't set this candidate to Active yet. Fill in ${missing.join(", ")}.`;
}
