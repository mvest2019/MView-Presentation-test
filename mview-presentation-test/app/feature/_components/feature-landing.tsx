import Image from "next/image";
import Link from "next/link";

import { buttonClass } from "../../_components/button";
import { h2Class } from "../../_components/typography";
import type { FeatureContent, FeatureStep } from "./feature-content";
import { RichText } from "./rich-text";

/*
 * The feature landing page — the design's v74 scroll progression (one idea per
 * screen: numbered steps joined by connectors, a "how to access" or guardrail
 * card, one closing CTA band), rebuilt from `mv-*` tokens and Tailwind
 * utilities instead of the prototype's own stylesheet. Type is the site's
 * Lexend Deca throughout, inherited from `font-sans` on <body>.
 *
 * One component serves both templates; which blocks render is decided by which
 * fields the page's generated `content.ts` carries — see `feature-content.ts`
 * for the field-to-template mapping.
 *
 * Band alternation is positional, as in the design: odd steps sit on white,
 * even steps on the page ground, and a professional page's opening "what it
 * saves you" step gets the mint-gradient band regardless.
 */

/** The content column every band shares — the prototype's 1140px `.wrap`. */
const wrap = "mx-auto w-full max-w-[1140px] px-6 max-[767px]:px-4";

const labelClass =
  "text-[12px] font-bold uppercase tracking-[.09em] text-mv-green-deep";

function Connector() {
  return (
    <div aria-hidden="true" className="flex flex-col items-center pb-2 pt-[10px]">
      <span className="h-[26px] w-px bg-mv-line" />
      <span className="mt-[3px] text-[13px] leading-none text-mv-muted">↓</span>
    </div>
  );
}

/** The owner pages' "Read the full story" fold — native, no script. */
function ReadMore({ paragraphs }: { paragraphs: string[] }) {
  return (
    <details className="group mt-[14px] max-w-[680px] rounded-[10px] border border-mv-line bg-white">
      <summary className="flex cursor-pointer list-none items-center px-[14px] py-[11px] text-[13px] font-bold text-mv-green-deep [&::-webkit-details-marker]:hidden">
        Read the full story
        <span aria-hidden="true" className="ml-auto text-[15px] text-mv-muted">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">–</span>
        </span>
      </summary>
      <div className="px-[14px] pb-[14px]">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="mt-[9px] text-[13.5px] leading-[1.6] text-mv-muted first:mt-0"
          >
            <RichText text={p} />
          </p>
        ))}
      </div>
    </details>
  );
}

function StepImage({
  image,
  first,
}: {
  image: NonNullable<FeatureStep["image"]>;
  first?: boolean;
}) {
  return (
    <figure
      className={`m-0 overflow-hidden rounded-[14px] shadow-mv max-[860px]:order-first ${
        first ? "" : "max-[860px]:mt-4"
      }`}
    >
      <Image
        src={image.src}
        alt={image.alt}
        width={1280}
        height={720}
        className="block h-[clamp(200px,26vw,320px)] w-full object-cover"
      />
    </figure>
  );
}

function StepBody({ step }: { step: FeatureStep }) {
  return (
    <div className="min-w-0">
      {step.lede?.map((p, i) => (
        <p
          key={i}
          className="mt-[10px] max-w-[720px] text-[19px] font-semibold leading-[1.45] tracking-[-.005em] text-mv-ink first:mt-[10px]"
        >
          <RichText text={p} />
        </p>
      ))}
      {step.bullets ? (
        <ul className="mt-[10px] flex max-w-[680px] flex-col gap-[9px]">
          {step.bullets.map((item, i) => (
            <li
              key={i}
              className="relative pl-[26px] text-[14.5px] leading-[1.5] text-mv-slate"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-[2px] flex h-[17px] w-[17px] items-center justify-center rounded-full bg-mv-mint text-[10px] font-extrabold text-mv-green-deep"
              >
                ✓
              </span>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      ) : null}
      {step.paragraphs?.map((p, i) => (
        <p
          key={i}
          className="mt-[10px] max-w-[760px] text-[14.5px] leading-[1.6] text-mv-slate"
        >
          <RichText text={p} />
        </p>
      ))}
      {step.more ? <ReadMore paragraphs={step.more} /> : null}
    </div>
  );
}

function Step({ step, mint }: { step: FeatureStep; mint: boolean }) {
  return (
    <>
      <div className="flex items-center gap-[14px]">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-mv-mint text-[19px] font-bold text-mv-green-deep"
        >
          {step.num}
        </span>
        <div>
          {step.kicker ? (
            <div className="text-[11px] font-bold uppercase tracking-[.08em] text-mv-green-deep">
              {step.kicker}
            </div>
          ) : null}
          <h2 className="text-[24px] font-semibold leading-[1.2] tracking-[-.01em] text-mv-ink max-[767px]:text-[21px]">
            <RichText text={step.title} />
          </h2>
        </div>
      </div>

      {step.saves ? (
        <ul className="mt-4 grid grid-cols-3 gap-[18px] max-[860px]:grid-cols-1 max-[860px]:gap-3">
          {step.saves.map((item, i) => (
            <li
              key={i}
              className={`relative rounded-[14px] border border-mv-mint-edge p-[18px] pl-[46px] text-[14px] leading-[1.5] text-mv-slate shadow-mv ${
                mint ? "bg-white" : "bg-mv-card-tint"
              }`}
            >
              <span
                aria-hidden="true"
                className="absolute left-4 top-[17px] flex h-[23px] w-[23px] items-center justify-center rounded-full bg-mv-mint text-[12px] font-extrabold text-mv-green-deep"
              >
                ✓
              </span>
              <strong className="mb-[5px] block text-[15px] font-bold text-mv-ink">
                {item.lead}
              </strong>
              {item.detail}
            </li>
          ))}
        </ul>
      ) : null}

      {step.ordered ? (
        <ol className="mt-3 max-w-[680px]">
          {step.ordered.map((item, i) => (
            <li
              key={i}
              className="flex items-baseline gap-4 border-b border-mv-line py-[13px] last:border-0"
            >
              <span
                aria-hidden="true"
                className="w-10 flex-none text-[30px] font-bold leading-none text-mv-green"
              >
                {i + 1}
              </span>
              <p className="text-[14.5px] leading-[1.55] text-mv-slate">
                <RichText text={item} />
              </p>
            </li>
          ))}
        </ol>
      ) : null}

      {step.image ? (
        <div className="mt-4 grid items-center gap-10 min-[861px]:grid-cols-[1.05fr_.95fr] max-[860px]:gap-4">
          {step.imageFirst ? (
            <>
              <StepImage image={step.image} first />
              <StepBody step={step} />
            </>
          ) : (
            <>
              <StepBody step={step} />
              <StepImage image={step.image} />
            </>
          )}
        </div>
      ) : (
        <StepBody step={step} />
      )}
    </>
  );
}

export function FeatureLanding({ content }: { content: FeatureContent }) {
  const { hero, steps, access, guardrail, cta } = content;

  return (
    <div className="pb-11">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className={`${wrap} pb-2 pt-[46px] max-[767px]:pt-8`}>
        <Link
          href={hero.back.href}
          className="text-[13px] font-semibold text-mv-green-deep !no-underline hover:underline"
        >
          {hero.back.label}
        </Link>
        <div className={`${labelClass} mt-3`}>{hero.label}</div>
        {hero.image ? (
          <figure className="mb-1 mt-[14px] overflow-hidden rounded-[14px]">
            <Image
              src={hero.image.src}
              alt={hero.image.alt}
              width={2280}
              height={480}
              priority
              className="block h-[clamp(150px,24vw,240px)] w-full object-cover"
            />
          </figure>
        ) : null}
        <h1 className={`${h2Class} mt-2 text-mv-ink`}>
          <RichText text={hero.heading} />
        </h1>
        <p className="mt-2 max-w-[780px] text-[15.5px] leading-[1.6] text-mv-muted">
          <RichText text={hero.sub} />
        </p>
        {hero.cta ? (
          <p className="mt-[14px] flex flex-wrap items-center gap-[10px]">
            <Link
              href={hero.cta.href}
              className={buttonClass({ variant: "primary", size: "lg" })}
            >
              {hero.cta.label}
            </Link>
            <span className="text-[12px] text-mv-muted">{hero.cta.note}</span>
          </p>
        ) : null}
        {hero.notice ? (
          <div className="mt-4 max-w-[780px] rounded-xl border border-mv-line border-l-4 border-l-mv-amber bg-white p-4 text-[13.5px] leading-[1.6] text-mv-slate shadow-mv">
            <span aria-hidden="true" className="mr-1 text-mv-amber">
              ⚠
            </span>
            <RichText text={hero.notice} />
          </div>
        ) : null}
        <div className="mt-[22px] flex flex-wrap items-center gap-x-[14px] gap-y-2">
          <span className={`${labelClass} whitespace-nowrap normal-case tracking-normal`}>
            {hero.stepsHint.count}
          </span>
          <span className="text-[12px] font-semibold text-mv-muted">
            {hero.stepsHint.titles.map((title, i) => (
              <span key={title} className="whitespace-nowrap">
                {i > 0 ? <span className="mx-[6px] text-mv-line">·</span> : null}
                <b className="text-mv-green-deep">
                  {String(i + 1).padStart(2, "0")}
                </b>{" "}
                {title}
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* ── Steps ─────────────────────────────────────────────── */}
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        // the pro pages open on the mint "what it saves you" band; after that,
        // odd positions sit on white, even on the page ground
        const mint = content.slug.startsWith("pro-") && i === 0;
        const alt = !mint && i % 2 === 0;
        return (
          <div key={step.num}>
            <Connector />
            <div
              className={
                mint
                  ? "bg-gradient-to-b from-mv-tint to-mv-card-tint py-[46px] max-[767px]:py-8"
                  : alt
                    ? "border-y border-mv-line bg-white py-[46px] max-[767px]:py-8"
                    : "py-[46px] max-[767px]:py-8"
              }
            >
              <div className={wrap}>
                <Step step={step} mint={mint} />

                {/* the closing blocks ride inside the last band, as designed */}
                {isLast && access ? (
                  <div className="mt-[22px] rounded-xl border border-mv-line bg-white p-5 shadow-mv">
                    <h3 className="text-[16px] font-semibold text-mv-ink">
                      How to access
                    </h3>
                    <div className="mt-[10px] grid grid-cols-3 gap-3 max-[860px]:grid-cols-1">
                      {access.map((col) => (
                        <div key={col.label}>
                          <div className="text-[11px] font-bold uppercase tracking-[.04em] text-mv-muted">
                            {col.label}
                          </div>
                          <p className="mt-1 text-[13.5px] leading-[1.55] text-mv-slate">
                            <RichText text={col.body} />
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {isLast && guardrail ? (
                  <div className="mt-[22px] rounded-xl border border-mv-line border-l-4 border-l-mv-green bg-white p-5 shadow-mv">
                    <h3 className="text-[16px] font-semibold text-mv-ink">
                      {guardrail.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-[1.6] text-mv-slate">
                      <RichText text={guardrail.body} />
                    </p>
                  </div>
                ) : null}

                {isLast && cta ? (
                  <div className="mt-[18px] flex flex-wrap items-center gap-4 rounded-[14px] border border-mv-mint-edge bg-mv-mint px-5 py-4">
                    <div className="min-w-[260px] flex-1">
                      <strong className="text-[15px] font-bold text-mv-ink">
                        <RichText text={cta.heading} />
                      </strong>
                      <p className="mt-1 text-[13px] text-mv-muted">
                        <RichText text={cta.sub} />
                      </p>
                    </div>
                    <div className="flex flex-none flex-col items-end gap-[6px] max-[560px]:w-full max-[560px]:items-start">
                      {cta.primary ? (
                        <Link
                          href={cta.primary.href}
                          className={buttonClass({ variant: "primary", size: "lg" })}
                        >
                          {cta.primary.label}
                        </Link>
                      ) : null}
                      {cta.links.map((link) => (
                        <Link
                          key={link.href + link.label}
                          href={link.href}
                          className={buttonClass({ variant: "outline", size: "sm" })}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
