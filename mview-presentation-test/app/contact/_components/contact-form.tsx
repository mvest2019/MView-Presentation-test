"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { contactConfig as cfg } from "./contact-config";
import { contactSchema, type ContactValues } from "./contact-schema";

/**
 * Left card — the message form.
 *
 * No required-field asterisks and no key explaining them: the only optional
 * field says so on its own label, which is the whole convention. Errors sit in
 * `empty:hidden` slots, so the card is short at rest and grows when a message
 * appears; the submit row carries its own top padding so a message can never
 * crowd the button.
 */

const inputBase =
  "w-full rounded-[9px] border bg-white px-[13px] py-[11px] text-[15px] text-mv-ink outline-none placeholder:text-[#9aa3ae] focus:ring-2";
const okBorder = "border-[#cbd5e1] focus:border-mv-green-deep focus:ring-mv-green/25";
const errBorder = "border-mv-red ring-2 ring-mv-red/10 focus:ring-mv-red/20";
const labelClass = "mb-[6px] block text-[13.5px] font-semibold text-mv-slate";
const errClass =
  "mt-[5px] block text-[13px] font-semibold leading-[17px] text-mv-red empty:hidden";

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
      <div className="mb-2 text-[12px] font-bold uppercase tracking-[.12em] text-mv-green-deep">
        Send a message
      </div>
      <h2 className="font-serif text-[20px] font-semibold leading-[1.25] tracking-[-.01em] text-mv-ink">
        How can we help?
      </h2>
      <p className="m-0 mb-5 mt-1.5 text-[13.5px] leading-[1.5] text-mv-muted">
        Tell us a little about what you need, and we&rsquo;ll get back to you
        shortly.
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
        <div className="mb-[16px] grid grid-cols-1 gap-[16px] min-[521px]:grid-cols-2">
          <div>
            <label htmlFor="ctFirst" className={labelClass}>
              First name
            </label>
            <input
              id="ctFirst"
              type="text"
              autoComplete="given-name"
              placeholder="Enter your first name"
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
              Last name
            </label>
            <input
              id="ctLast"
              type="text"
              autoComplete="family-name"
              placeholder="Enter your last name"
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

        <div className="mb-[16px] grid grid-cols-1 gap-[16px] min-[521px]:grid-cols-2">
          <div>
            <label htmlFor="ctEmail" className={labelClass}>
              Email address
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
            <span id="ctEmailErr" className={errClass}>
              {errors.email?.message}
            </span>
          </div>

          <div>
            <label htmlFor="ctPhone" className={labelClass}>
              Phone{" "}
              <span className="text-[13px] font-normal text-mv-muted">
                (optional)
              </span>
            </label>
            <input
              id="ctPhone"
              type="tel"
              autoComplete="tel"
              placeholder="Enter your phone number"
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
            What can we help you with?
          </label>
          <textarea
            id="ctMsg"
            rows={3}
            placeholder="Tell us a little about your question…"
            aria-invalid={!!errors.comment}
            aria-describedby="ctMsgErr"
            className={`${inputBase} min-h-[92px] resize-y leading-[22px] ${
              errors.comment ? errBorder : okBorder
            }`}
            {...register("comment")}
          />
          <span id="ctMsgErr" className={errClass}>
            {errors.comment?.message}
          </span>
        </div>

        {/* `mt-auto` pins the row to the card's bottom, which keeps the two cards
            reading as one row; `pt-4` is the floor between it and whatever sits
            above, so a validation message never crowds the button. */}
        <div className="mt-auto flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting || sent}
            /* `cursor-pointer` is explicit because Tailwind v4's preflight sets
               buttons to `cursor: default`, which read as not-clickable. */
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-mv-green bg-mv-green px-[22px] py-2.5 text-[14.5px] font-semibold text-mv-green-ink transition hover:brightness-95 disabled:cursor-default disabled:opacity-80 min-[521px]:w-auto"
          >
            {isSubmitting ? (
              "Sending…"
            ) : sent ? (
              "Message sent ✓"
            ) : (
              <>
                Send message
                <ArrowUpRight className="h-[18px] w-[18px]" />
              </>
            )}
          </button>
        </div>
      </form>

      {done && (
        <p
          role="status"
          className={`mt-3 text-[13px] ${status === "error" ? "text-mv-red" : "text-mv-muted"}`}
        >
          {done}
        </p>
      )}
    </div>
  );
}
