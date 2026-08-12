"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { contactConfig as cfg } from "./contact-config";
import { contactSchema, type ContactValues } from "./contact-schema";

/**
 * Left card — the message form, following `contact_page_proposed.html`.
 *
 * Two things about the proposed layout are deliberate and worth not "fixing":
 * the intro, the reply promise and the required-field note are one line rather
 * than three, because the three-line version cost ~60px the right-hand card had
 * no content to match; and errors sit in `empty:hidden` slots rather than the
 * reserved fixed-height ones this form used to have, so the card is shorter at
 * rest and grows when a message appears.
 */

const inputBase =
  "w-full rounded-[9px] border bg-white px-3 py-[10px] text-sm text-mv-ink outline-none placeholder:text-[#9aa3ae] focus:ring-2";
const okBorder = "border-[#cbd5e1] focus:border-mv-green-deep focus:ring-mv-green/25";
const errBorder = "border-mv-red ring-2 ring-mv-red/10 focus:ring-mv-red/20";
const labelClass = "mb-[5px] block text-[12.5px] font-bold text-mv-slate";
const errClass =
  "block text-[12.5px] font-semibold leading-[16px] text-mv-red empty:hidden";
const req = <span className="font-extrabold text-mv-red">*</span>;

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      comment: "",
    },
  });
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [done, setDone] = useState("");

  async function onValid(values: ContactValues) {
    setStatus("idle");
    try {
      // Posted straight to the backend from the browser. `values` already
      // matches the contract — { firstName, lastName, email, phone, comment } —
      // so it goes as-is.
      const res = await fetch(process.env.CONTACT_API_URL as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(String(res.status));
      // Empty the fields, so the sent message is not left sitting in the form
      // looking like it still needs sending. Only on success — on failure the
      // text is kept so the visitor does not have to retype it.
      reset();
      setStatus("sent");
      setDone("Thank you — a person replies within one business day.");
    } catch {
      // Covers a rejected request and a blocked one alike: a CORS failure
      // surfaces here as a TypeError, not as a status code.
      setStatus("error");
      setDone(`Something went wrong. Please email ${cfg.supportEmail}.`);
    }
  }

  const sent = status === "sent";

  return (
    <div className="flex h-full flex-col rounded-mv border border-mv-line bg-mv-card p-[22px] shadow-mv">
      <div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[.12em] text-mv-green-deep">
        Send a message
      </div>
      <h2 className="mb-1.5 font-serif text-[19px] font-semibold leading-[1.25] tracking-[-.01em] text-mv-ink">
        Have a question or comment?
      </h2>

      <p className="m-0 mb-[14px] text-xs text-mv-muted">
        A person, not a bot — we reply within{" "}
        <strong className="font-semibold text-mv-slate">one business day</strong>.
        Prefer email?{" "}
        <a
          className="text-mv-green-deep no-underline hover:underline"
          href={cfg.email.href}
        >
          {cfg.supportEmail}
        </a>
        .{/* Own line with a little air above it, rather than wrapping tight
             against the sentence it follows. */}
        <span className="mt-[6px] block whitespace-nowrap">{req} Required.</span>
      </p>

      {/* Typing after a send clears the confirmation and re-enables the button,
          so a second message is possible without reloading. The button stays
          disabled until then, which is what stops a double submit. */}
      <form
        noValidate
        onSubmit={handleSubmit(onValid)}
        onChange={() => {
          if (status !== "idle") {
            setStatus("idle");
            setDone("");
          }
        }}
        className="flex flex-1 flex-col"
      >
        <div className="mb-[14px] grid grid-cols-1 gap-[14px] min-[521px]:grid-cols-2">
          <div>
            <label htmlFor="ctFirst" className={labelClass}>
              First Name {req}
            </label>
            <input
              id="ctFirst"
              type="text"
              autoComplete="given-name"
              placeholder="Enter First Name"
              aria-invalid={!!errors.firstName}
              aria-describedby="ctFirstErr"
              className={`${inputBase} ${errors.firstName ? errBorder : okBorder}`}
              {...register("firstName")}
            />
            <span id="ctFirstErr" className={errClass}>
              {errors.firstName?.message}
            </span>
          </div>

          <div>
            <label htmlFor="ctLast" className={labelClass}>
              Last Name {req}
            </label>
            <input
              id="ctLast"
              type="text"
              autoComplete="family-name"
              placeholder="Enter Last Name"
              aria-invalid={!!errors.lastName}
              aria-describedby="ctLastErr"
              className={`${inputBase} ${errors.lastName ? errBorder : okBorder}`}
              {...register("lastName")}
            />
            <span id="ctLastErr" className={errClass}>
              {errors.lastName?.message}
            </span>
          </div>
        </div>

        <div className="mb-[14px] grid grid-cols-1 gap-[14px] min-[521px]:grid-cols-2">
          <div>
            <label htmlFor="ctEmail" className={labelClass}>
              Email {req}
            </label>
            <input
              id="ctEmail"
              type="email"
              autoComplete="email"
              placeholder="Enter Email Address"
              aria-invalid={!!errors.email}
              aria-describedby="ctEmailErr"
              className={`${inputBase} ${errors.email ? errBorder : okBorder}`}
              {...register("email")}
            />
            <span id="ctEmailErr" className={errClass}>
              {errors.email?.message}
            </span>
          </div>

          <div>
            <label htmlFor="ctPhone" className={labelClass}>
              Phone{" "}
              <span className="text-xs font-normal text-mv-muted">(optional)</span>
            </label>
            <input
              id="ctPhone"
              type="tel"
              autoComplete="tel"
              placeholder="Enter Phone Number"
              aria-invalid={!!errors.phone}
              aria-describedby="ctPhoneErr"
              className={`${inputBase} ${errors.phone ? errBorder : okBorder}`}
              {...register("phone")}
            />
            <span id="ctPhoneErr" className={errClass}>
              {errors.phone?.message}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="ctMsg" className={labelClass}>
            What&rsquo;s your question or comment about? {req}
          </label>
          <textarea
            id="ctMsg"
            rows={3}
            placeholder="Enter Comments"
            aria-invalid={!!errors.comment}
            aria-describedby="ctMsgErr"
            className={`${inputBase} min-h-[76px] resize-y leading-[20px] ${
              errors.comment ? errBorder : okBorder
            }`}
            {...register("comment")}
          />
          <span id="ctMsgErr" className={errClass}>
            {errors.comment?.message}
          </span>
        </div>

        {/* `mt-auto` pins this to the card's bottom, which is what keeps the two
            cards reading as one row; auto-width from 521px up, per the proposal. */}
        <button
          type="submit"
          disabled={isSubmitting || sent}
          /* `cursor-pointer` is explicit because Tailwind v4's preflight sets
             buttons to `cursor: default`, which read as not-clickable. */
          className="mt-auto inline-flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-2 self-start rounded-[10px] border border-mv-green bg-mv-green px-[22px] py-2.5 text-sm font-semibold text-mv-green-ink transition hover:brightness-95 disabled:cursor-default disabled:opacity-80 min-[521px]:w-auto"
        >
          {isSubmitting ? (
            "Sending…"
          ) : sent ? (
            "Message sent ✓"
          ) : (
            <>
              Send Message
              <Send className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {done && (
        <p
          role="status"
          className={`mt-2.5 text-xs ${status === "error" ? "text-mv-red" : "text-mv-muted"}`}
        >
          {done}
        </p>
      )}
    </div>
  );
}
