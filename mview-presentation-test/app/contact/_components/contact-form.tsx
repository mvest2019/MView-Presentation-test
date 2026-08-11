"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { inlineLink } from "../../_components/typography";
import { contactConfig as cfg } from "./contact-config";
import { contactSchema, type ContactValues } from "./contact-schema";

const inputBase =
  "w-full rounded-[9px] border bg-white px-3 py-[9px] text-sm text-mv-ink outline-none placeholder:text-[#9aa3ae] focus:ring-2";
const okBorder = "border-[#cbd5e1] focus:border-mv-green-deep focus:ring-mv-green/25";
const errBorder = "border-mv-red ring-2 ring-mv-red/10 focus:ring-mv-red/20";

/** Left card — the message form. react-hook-form + zod, matching the prototype. */
export function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
  });
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [done, setDone] = useState("");

  // The intro copy lives behind the ⓘ button. It opens as an overlay rather
  // than in flow: in flow it would grow the card, and the card's height is
  // pinned by the equal-height pairing with "Get in touch".
  const [introOpen, setIntroOpen] = useState(false);
  const introRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!introOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!introRef.current?.contains(event.target as Node)) setIntroOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIntroOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [introOpen]);

  const errorCount = Object.keys(errors).length;

  async function onValid(values: ContactValues) {
    setStatus("idle");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      setDone("Thank you — a person replies within one business day.");
    } catch {
      setStatus("error");
      setDone(`Something went wrong. Please email ${cfg.supportEmail}.`);
    }
  }

  // Fixed-height error slot under each field, so showing a message never shifts the card.
  const slot = (id: string, msg?: string) => (
    <span id={id} className="mt-[5px] block min-h-[16px] text-[12.5px] font-semibold leading-[16px] text-mv-red">
      {msg ?? ""}
    </span>
  );

  const sent = status === "sent";

  return (
    <div className="flex h-full flex-col rounded-mv border border-mv-line bg-mv-card p-[22px] shadow-mv">
      <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[.12em] text-mv-green-deep">
        Send a message
      </div>
      <div ref={introRef} className="relative mb-3 flex items-start gap-[7px]">
        <h2 className="font-serif text-[19px] font-semibold leading-[1.25] tracking-[-.01em] text-mv-ink">
          Have a question or comment?
        </h2>
        <button
          type="button"
          onClick={() => setIntroOpen((open) => !open)}
          aria-expanded={introOpen}
          aria-controls="ctIntro"
          aria-label="How soon do we reply?"
          className={`mt-[5px] flex h-[17px] w-[17px] flex-none cursor-pointer items-center justify-center rounded-full border transition ${
            introOpen
              ? "border-mv-green-deep bg-mv-green-deep text-white"
              : "border-mv-green-deep/45 text-mv-green-deep hover:border-mv-green-deep hover:bg-mv-mint"
          }`}
        >
          <Info className="h-[11px] w-[11px]" strokeWidth={2.6} />
        </button>

        <div
          id="ctIntro"
          hidden={!introOpen}
          className="absolute left-0 top-full z-20 mt-[6px] w-[min(360px,100%)] rounded-[10px] border border-mv-line bg-mv-card p-3 text-xs leading-[1.55] text-mv-slate shadow-mv-lg"
        >
          Send us a message — a person, not a bot, replies within{" "}
          <strong>one business day</strong>. Prefer email? Write to{" "}
          <a className={inlineLink} href={cfg.email.href}>
            {cfg.supportEmail}
          </a>{" "}
          and you reach the same desk.
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit(onValid)}>
        {/* One fixed-height line: the required-field hint, or the error summary when invalid.
            Merging them removes the extra gap above the first field and never shifts height. */}
        <p role="alert" aria-live="polite" className="mt-0 mb-3 min-h-[16px] text-[12.5px] leading-[16px]">
          {errorCount > 0 ? (
            <span className="font-semibold text-mv-red">
              {errorCount === 1
                ? "One field needs your attention before this can send."
                : `${errorCount} fields need your attention before this can send.`}
            </span>
          ) : (
            <span className="text-mv-muted">
              <span className="font-extrabold text-mv-red">*</span> Required field
            </span>
          )}
        </p>

        {/* Your name */}
        <div>
          <label htmlFor="ctName" className="text-[12.5px] font-bold text-mv-slate">
            Your name <span className="font-extrabold text-mv-red">*</span>
          </label>
          <input
            id="ctName"
            type="text"
            autoComplete="name"
            placeholder="Name"
            aria-invalid={!!errors.name}
            aria-describedby="ctNameErr"
            className={`${inputBase} ${errors.name ? errBorder : okBorder}`}
            {...register("name")}
          />
          {slot("ctNameErr", errors.name?.message)}
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-1 gap-[14px] min-[521px]:grid-cols-2">
          <div>
            <label htmlFor="ctEmail" className="text-[12.5px] font-bold text-mv-slate">
              Email <span className="font-extrabold text-mv-red">*</span>
            </label>
            <input
              id="ctEmail"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby="ctEmailErr"
              className={`${inputBase} ${errors.email ? errBorder : okBorder}`}
              {...register("email")}
            />
            {slot("ctEmailErr", errors.email?.message)}
          </div>

          <div>
            <label htmlFor="ctPhone" className="text-[12.5px] font-bold text-mv-slate">
              Phone <span className="text-xs font-normal text-mv-muted">(optional)</span>
            </label>
            <input
              id="ctPhone"
              type="tel"
              autoComplete="tel"
              placeholder="(555) 555-5555"
              aria-invalid={!!errors.phone}
              aria-describedby="ctPhoneErr"
              className={`${inputBase} ${errors.phone ? errBorder : okBorder}`}
              {...register("phone")}
            />
            {slot("ctPhoneErr", errors.phone?.message)}
          </div>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="ctMsg" className="text-[12.5px] font-bold text-mv-slate">
            Message <span className="font-extrabold text-mv-red">*</span>
          </label>
          <textarea
            id="ctMsg"
            rows={4}
            placeholder="How can we help?"
            aria-invalid={!!errors.message}
            aria-describedby="ctMsgHint ctMsgErr"
            className={`${inputBase} ${errors.message ? errBorder : okBorder}`}
            {...register("message")}
          />
          <span id="ctMsgHint" className="mt-[5px] block text-xs text-mv-muted">
            Never send a password, a bank account, or a social security number.
          </span>
          {slot("ctMsgErr", errors.message?.message)}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || sent}
          className="mt-1 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-mv-green bg-mv-green px-[18px] py-2.5 text-sm font-semibold text-mv-green-ink transition hover:brightness-95 disabled:cursor-default disabled:opacity-80"
        >
          {isSubmitting ? (
            "Sending…"
          ) : sent ? (
            "Message sent ✓"
          ) : (
            <>
              Send message
              <Send className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {done && (
        <p role="status" className={`mt-2.5 text-xs ${status === "error" ? "text-mv-red" : "text-mv-muted"}`}>
          {done}
        </p>
      )}
    </div>
  );
}
