"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, CircleCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { contactConfig as cfg } from "./contact-config";
import { contactSchema, type ContactValues } from "./contact-schema";

/**
 * Left card — the message form.
 *
 * Required fields carry an asterisk, but there is no "* Required" key spelling
 * it out — that legend was removed as noise, and the asterisk is a convention
 * visitors already read. Errors sit in `empty:hidden` slots, so the card is
 * short at rest and grows when a message appears; the submit row carries its own
 * top padding so a message can never crowd the button.
 */

const inputBase =
  "w-full rounded-[9px] border bg-white px-[13px] py-[11px] text-[15px] text-mv-ink outline-none placeholder:text-[#9aa3ae] focus:ring-2";
const okBorder = "border-[#cbd5e1] focus:border-mv-green-deep focus:ring-mv-green/25";
const errBorder = "border-mv-red ring-2 ring-mv-red/10 focus:ring-mv-red/20";
const labelClass = "mb-[6px] block text-[13.5px] font-semibold text-mv-slate";
/**
 * Error slot. Takes no space until it has something to say — reserving the line
 * up front kept the card height constant, but it also pushed the fields ~17px
 * apart at rest, which is not what the design asks for. So the form does grow on
 * a failed submit; the get-in-touch card is held out of that by `self-start`.
 */
const errClass =
  "mt-[5px] block text-[13px] font-semibold leading-[17px] text-mv-red empty:hidden";
/** Marks a required field. `aria-hidden` because a screen reader announces the
 *  input's own required state — the glyph on the label would just be noise. */
const req = (
  <span aria-hidden className="font-extrabold text-mv-red">
    *
  </span>
);

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
  /** Set only when a send fails; success is announced by the toast alone. */
  const [failure, setFailure] = useState("");

  /**
   * Success toast — the one and only confirmation of a send. The button label
   * stays put and no inline line is added, so the news is told once.
   *
   * `fixed`, so it cannot affect either card's height — the point the whole
   * layout has been fighting over. Auto-hides after 6s.
   */
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function showToast() {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(true);
    toastTimer.current = setTimeout(() => setToast(false), 6000);
  }

  async function onValid(values: ContactValues) {
    setFailure("");
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
      showToast();
    } catch {
      // Covers a rejected request and a blocked one alike: a CORS failure
      // surfaces here as a TypeError, not as a status code.
      setFailure(`Something went wrong. Please email ${cfg.supportEmail}.`);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-mv border border-mv-line bg-mv-card p-[22px] shadow-mv">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          /* Width is set, not left to the content: as a shrink-to-fit box the
             message wrapped over five lines on a phone. `w-[calc(100vw-24px)]`
             takes the screen less a small margin, `max-w-[380px]` stops it
             stretching on a desktop. */
          className="fixed left-1/2 top-[84px] z-50 flex w-[calc(100vw-24px)] max-w-[380px] -translate-x-1/2 items-start gap-2.5 rounded-[12px] bg-mv-green-ink px-[18px] py-[14px] shadow-mv-lg"
        >
          <CircleCheck className="mt-[1px] h-[19px] w-[19px] flex-none text-mv-green" />
          <p className="m-0 text-[13.5px] font-semibold leading-[1.45] text-mv-green">
            Your message has been sent successfully. We&rsquo;ll get back to you
            soon!
          </p>
        </div>
      )}

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

      {/* Typing clears a previous failure notice — it refers to an attempt the
          visitor has now moved on from. Nothing else to reset: the button label
          never changed, and the toast times itself out. */}
      <form
        noValidate
        onSubmit={handleSubmit(onValid)}
        onChange={() => {
          if (failure) setFailure("");
        }}
        className="flex flex-1 flex-col"
      >
        <div className="mb-[16px] grid grid-cols-1 gap-[16px] min-[521px]:grid-cols-2">
          <div>
            <label htmlFor="ctFirst" className={labelClass}>
              First name {req}
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
              Last name {req}
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
              Email address {req}
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
            What can we help you with? {req}
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
          {/* Label only reflects the in-flight state. It deliberately does not
              switch to a "sent" label afterwards: the toast is the confirmation,
              and two of them saying the same thing is noise. */}
          <button
            type="submit"
            disabled={isSubmitting}
            /* `cursor-pointer` is explicit because Tailwind v4's preflight sets
               buttons to `cursor: default`, which read as not-clickable. */
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-mv-green bg-mv-green px-[22px] py-2.5 text-[14.5px] font-semibold text-mv-green-ink transition hover:brightness-95 disabled:cursor-default disabled:opacity-80 min-[521px]:w-auto"
          >
            {isSubmitting ? (
              "Sending…"
            ) : (
              <>
                Send message
                <ArrowUpRight className="h-[18px] w-[18px]" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Failures only. Success is the toast's job, so there is no inline line to
          duplicate it — but a failure needs to persist and name the fallback
          address, which a toast that disappears after six seconds cannot do. */}
      {failure && (
        <p role="alert" className="mt-3 text-[13px] text-mv-red">
          {failure}
        </p>
      )}
    </div>
  );
}
