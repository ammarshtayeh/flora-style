"use client";

import { Mail, Phone } from "lucide-react";
import type { StoreSettings } from "@/lib/store";
import { getStoreContactLinks } from "@/lib/contact";

type StoreContactLinksProps = {
  settings: StoreSettings;
  variant?: "footer" | "menu";
};

function SocialIcon({ id, size = 16 }: { id: string; size?: number }) {
  if (id === "email") return <Mail size={size} />;
  if (id === "whatsapp") return <Phone size={size} />;

  if (id === "instagram") {
    return (
      <svg aria-hidden fill="none" height={size} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width={size}>
        <rect height="18" rx="5" width="18" x="3" y="3" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.2" cy="6.8" fill="currentColor" r="1" stroke="none" />
      </svg>
    );
  }

  if (id === "facebook") {
    return (
      <svg aria-hidden fill="currentColor" height={size} viewBox="0 0 24 24" width={size}>
        <path d="M14 8.5V7.2c0-.7.6-1.2 1.3-1.2H17V3h-2.4C12.8 3 11 4.9 11 7.2V8.5H9v3.2h2V21h3v-9.3h2.6L17 11.7h-3Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden fill="currentColor" height={size} viewBox="0 0 24 24" width={size}>
      <path d="M16.6 5.82c.81 0 1.56-.28 2.15-.82V8.5a4.83 4.83 0 0 1-2.15-.48v6.13a5.89 5.89 0 1 1-5.3-5.86v2.2a3.6 3.6 0 1 0 2.55 3.45V3h2.15a3.73 3.73 0 0 0 3.6 3.55V5.82Z" />
    </svg>
  );
}

export function StoreContactLinks({ settings, variant = "footer" }: StoreContactLinksProps) {
  const links = getStoreContactLinks(settings);
  if (!links.length) return null;

  return (
    <div className={`store-contact-links store-contact-links--${variant}`}>
      {links.map((link) => (
        <a
          className="store-contact-links__item"
          href={link.href}
          key={link.id}
          rel={link.external ? "noreferrer" : undefined}
          target={link.external ? "_blank" : undefined}
        >
          <SocialIcon id={link.id} />
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}
