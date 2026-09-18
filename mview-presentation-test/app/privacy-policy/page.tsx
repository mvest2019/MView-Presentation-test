import Link from "next/link";

import { LegalPage, LegalSection, legalMetadata } from "../_components/legal-page";
import { CookieNotice } from "./_components/cookie-notice";

/**
 * Privacy Policy — version 2026.09.16 (MV-PRIV in `lib/legal/versions.ts`).
 *
 * PORTED FROM THE LIVE SITE'S 9/16 TEXT: `app/privacy-policy/_components/
 * PrivacyPolicyContent.tsx` on `Mview-Production_V1`, commit 2085fb9 ("Update
 * Privacy Policy and Terms & Conditions content", 2026-09-16). This replaces
 * the earlier port, which was the June 2023 text. Legal text: restyle it
 * freely, but do not reword, reorder or summarise it. The port is mechanical —
 * the shadcn `Card`/`Badge`/`Separator` wrappers unwrapped, every `className`
 * stripped, the badge grids and bullet arrays made real `<ul>` lists, the
 * teal callout cards made `<aside>` — and the visible text was then diffed
 * against the source.
 *
 * DIFFERENCES FROM THE LIVE TEXT, ALL DELIBERATE, ALL FLAGGED FOR COUNSEL:
 *
 *   · COOKIES. This site runs no analytics or advertising tools, so its
 *     cookie section lists what it does run — see `cookie-notice.tsx` for the
 *     full account. "Sharing Information for Advertising" is adjusted to match
 *     (below): the live text opens "We use Google Ads", which is not true here.
 *   · `support@mineralview.com` where the live text has `help@` — the site's
 *     standing substitution (Ryan, 2026-08-13; see `legal-contact.tsx`).
 *     `privacy@` is kept as written: it is a distinct mailbox for privacy
 *     requests, not the general support address.
 *   · Word boundaries the live markup loses (JSX drops a newline between text
 *     and a tag) are restored with `{" "}`; no character of the text changes.
 *
 * The version line under the title comes from `lib/legal/versions.ts`. Any
 * change to this file's text needs a version bump there and
 * `npm run legal:hash`; `npm test` fails otherwise.
 *
 * The 14 section ids are the live site's, so existing deep links still
 * resolve; `overview` is this build's own, for the introduction.
 */

const TITLE = "Privacy Policy";
const LEDE =
  "How Mineral View collects, uses, shares and protects your information.";

export const metadata = legalMetadata(TITLE, LEDE);

const SECTIONS = [
  { id: "overview", label: "Mineral View Protects Your Privacy" },
  { id: "personal-info", label: "What Personal Information Mineral View Collects?" },
  { id: "non-personal-info", label: "What Non-Personal Information Mineral View Collects?" },
  { id: "data-download", label: "About Data Download" },
  { id: "cookies", label: "Cookies" },
  { id: "email", label: "Email and Promotional Materials" },
  { id: "security", label: "Security of Personal Information" },
  { id: "links", label: "Links to Other Websites" },
  { id: "access", label: "Access, Update, and Correction of Personal Information" },
  { id: "changes", label: "Updates and Changes to Privacy Policy" },
  { id: "deactivation", label: "Revoking Consent or Deactivating Your Account" },
  { id: "children", label: "Children's Privacy" },
  { id: "california", label: "California Shine the Light Law" },
  { id: "governing-law", label: "Governing Law" },
  { id: "contact", label: "Contact Us" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title={TITLE} lede={LEDE} doc="MV-PRIV" sections={SECTIONS}>
      <LegalSection id="overview" title="Mineral View Protects Your Privacy">
        <p>
          Mineral View, LLC (&apos;Mineral View&apos;) is committed to
          safeguarding the privacy and security of its user&apos;s personal
          information. This Privacy Policy (&apos;Policy&apos;) highlights the
          types of personal information Mineral View accumulates and how it is
          utilized, shared, sold, and protected. By using the Mineral View
          Website, you agree to the terms of this Policy.
        </p>
      </LegalSection>

      <LegalSection id="personal-info" title="What Personal Information Mineral View Collects?">
        <p>Mineral View collects personal information such as:</p>
        <ul>
          <li>NAME</li>
          <li>ADDRESS</li>
          <li>EMAIL</li>
          <li>CONTACT DETAILS</li>
          <li>DETAILS OF THE COMPANY</li>
          <li>PAYMENT INFORMATION</li>
          <li>BILLING INFORMATION</li>
          <li>CORRESPONDENCE FROM USERS WHO PROVIDE SUCH INFORMATION</li>
        </ul>
        <p>
          Mineral View uses this information to provide its products and
          services, customer support, dispute resolution, troubleshooting,
          prevent illegal activities, customise and improve its services and
          content, and inform users about its products, services, updates and
          promotional offers.
        </p>
        <p>
          Mineral View does not disclose personal information to unaffiliated
          third parties for marketing purposes without your consent. However, as
          described in the &quot;How We Sell Data Products&quot; section below,
          some of the data products we license and sell may constitute a
          &quot;sale&quot; of personal information under applicable state
          privacy laws, and you may opt out of this at any time. Mineral View may
          disclose personal information to service providers who help it provide
          products and services, such as hosting, fulfillment, data processing
          and storage, and data security. Mineral View requires these service
          providers to use personal information only for the purposes for which
          it was provided.
        </p>
        <p>
          If you are a mineral or royalty owner, Mineral View compiles personal
          information about you from public records, including county clerk and
          appraisal district records, the Railroad Commission of Texas, and
          regulators in New Mexico, Oklahoma, Louisiana, Ohio, Pennsylvania,
          Colorado, New York, Wyoming, Utah, North Dakota, and West Virginia.
        </p>
        <p>
          We do not obtain this information directly from you. These records may
          contain your name, mailing address, associated mineral or royalty
          interests, lease and well identifiers, and production history. We
          compile, standardize, and display this information to subscribers and
          license and sell it as described below.
        </p>
        <p>
          Mineral View may disclose personal information when required by law or
          in good faith when necessary to prevent imminent physical harm or
          financial loss or to report suspected illegal activity.
        </p>
      </LegalSection>

      <LegalSection id="non-personal-info" title="What Non-Personal Information Mineral View Collects?">
        <p>Mineral View collects non-personal information such as:</p>
        <ul>
          <li>IP ADDRESS</li>
          <li>BROWSER CHARACTERISTICS</li>
          <li>DEVICE ID</li>
          <li>DEVICE OPERATING SYSTEM</li>
          <li>SYSTEM LANGUAGE PREFERENCES</li>
          <li>REFERRING URLS</li>
          <li>URLS OF WEBSITES VISITED</li>
          <li>TRAFFIC DATA</li>
          <li>LOCATION</li>
        </ul>
        <p>
          Mineral View uses cookies to customize user experience, ensure that
          users do not repeatedly see irrelevant content, and identify users as
          unique visitors to the Website.
        </p>
        <p>
          Mineral View may use web beacons or clear gifs to track user online
          movements and the effectiveness of its marketing campaigns. Mineral
          View may publish traffic data and information gathered using cookies in
          the aggregate, but it will not include personally identifiable data.
        </p>
      </LegalSection>

      <LegalSection id="data-download" title="About Data Download">
        <p>
          Mineral View offers a <span>Data Download</span> feature, enabling
          users to download their mineral, well, and production data in standard
          or customized formats. This feature is provided in accordance with
          applicable user rights and transparency requirements under data
          protection laws and does not affect any of your other personalized
          account settings.
        </p>
        <p>We offer the following data:</p>
        <ul>
          <li>Mineral Rolls Data</li>
          <li>Well Data</li>
          <li>Production Data</li>
        </ul>
        <p>
          For questions about the Data Download feature, please contact us at{" "}
          <a href="mailto:support@mineralview.com">support@mineralview.com</a>.
          Our team will respond to your inquiry promptly.
        </p>
        <aside>
          <p>
            The data download option complies with legal data security norms and
            reflects our commitment to protecting your privacy rights.
          </p>
        </aside>
        <h3>How We Sell Data Products</h3>
        <p>
          Our data products contain personal information about mineral and
          royalty owners compiled from public records. We license and sell those
          products to subscribers and other customers. Under applicable state
          privacy laws, this constitutes a &quot;sale&quot; of personal data.
          You may opt out of this sale at any time, free of charge, by contacting
          us at{" "}
          <a href="mailto:privacy@mineralview.com">privacy@mineralview.com</a>.
          Opting out removes your information from our platform but does not
          remove it from the county or state records it was originally compiled
          from, and we cannot retrieve data products already delivered to
          customers.
        </p>
        <h3>Sharing Information for Advertising</h3>
        {/* SITE-SPECIFIC. The live text opens "We use Google Ads. If you accept
            advertising cookies, identifiers associated with your browser are
            made available…". This site runs no advertising technology, so the
            first sentence states that and the second is made conditional on it
            being added; the legal characterisation that follows is unchanged. */}
        <p>
          This Website does not currently use Google Ads or any other
          advertising technology. If we add it, identifiers associated with your
          browser will be made available to Google to measure ad conversions and
          display our ads on other websites only if you accept advertising
          cookies. Under California law, this is considered &quot;sharing&quot;
          for cross-context behavioral advertising; under Texas law, it is
          considered &quot;targeted advertising.&quot; You may opt out at any
          time through our Cookie Settings tool.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies">
        <CookieNotice />
      </LegalSection>

      <LegalSection id="email" title="Email and Promotional Materials">
        <p>
          By establishing an account, making a purchase, or registering to
          receive the Mineral View newsletter, users consent to receive periodic
          commercial or promotional email communications from Mineral View.
          Users may opt-out of receiving such communications by following the
          unsubscribe instructions contained in each email, or by contacting
          Mineral View’s customer service department.
        </p>
        <p>
          Every marketing email includes an unsubscribe link, which we action
          within 10 business days, along with our physical postal address. If you
          provide your phone number, we will only contact you for marketing
          purposes with your prior express written consent, given through a
          checkbox that is never pre-ticked; this consent is not a condition of
          purchase. Reply STOP to any text message to opt out, and we honour the
          National Do Not Call Registry.
        </p>
      </LegalSection>

      <LegalSection id="security" title="Security of Personal Information">
        <p>
          Mineral View prioritize securing your personalized data on a primary
          basis and is committed to protecting it from cyber thefts. Mineral View
          executes multiple legal and technical measures in order to secure your
          data against destructions, disclosures, improper utilization,
          unauthorized accessibility and alteration.
        </p>
        <p>
          Mineral View uses SSL encryption to transmit personal information via
          secure servers. Payment information is processed securely by
          Braintree, a PCI-DSS compliant payment processor, and Mineral View does
          not store or have direct access to users&apos; full payment card
          information.
        </p>
        <p>
          Mineral View has implemented industry-standard security measures to
          protect users&apos; personal information during transmission and after
          receipt. However, no method of transmission over the Internet or
          Electronic Storage is 100% secure. Users should promptly notify Mineral
          View if they believe their personal information has been compromised.
        </p>
        <aside>
          <p>
            Mineral View uses personal information only for the purposes stated
            in this Policy. As described above, certain data products we license
            and sell may constitute a &quot;sale&quot; of personal information
            under applicable state law, and you may opt out of this at any time.
          </p>
        </aside>
        <h3>AI Features</h3>
        <p>
          If you use any AI-powered features on our Website, your inputs are
          processed by third-party AI providers acting as our service providers.
          Conversations are stored for 12 months and may be reviewed for quality
          purposes. We do not permit these providers to use your inputs to train
          their general-purpose models.
        </p>
        <h3>Data Breach Notification</h3>
        <p>
          In the event of a data breach, we investigate promptly and notify
          affected individuals without unreasonable delay. Where a breach affects
          250 or more Texas residents, we also notify the Texas Attorney General.
          We maintain a record of the incident and our response.
        </p>
      </LegalSection>

      <LegalSection id="links" title="Links to Other Websites">
        <p>
          Mineral View may provide links to other third-party Websites whose
          privacy practices differ from Mineral View&apos;s. Users should
          carefully read the privacy statement of any third-party Website they
          visit and submit personal information to.
        </p>
      </LegalSection>

      <LegalSection id="access" title="Access, Update, and Correction of Personal Information">
        <p>
          Mineral View wants users&apos; and mineral owners&apos; personal
          information to be complete and accurate. Whether or not you hold a
          Mineral View account, you may ask us to confirm what personal
          information we hold about you, provide a copy of it, correct it,
          suppress it, or opt out of its sale by emailing{" "}
          <a href="mailto:privacy@mineralview.com">privacy@mineralview.com</a>{" "}
          with your name and the county and state associated with your mineral
          interest. Suppression removes your information from our platform but
          does not remove it from the county or state records it originated
          from. Account holders may also review and change most of their
          personal information by logging into their account.
        </p>
        <h3>Data Retention</h3>
        <p>
          We retain personal information according to the following schedule:
        </p>
        <ul>
          <li>Accounts — active plus 24 months</li>
          <li>Billing records — 7 years</li>
          <li>Uploads — until deleted</li>
          <li>Forum posts — until deleted</li>
          <li>AI chat conversations — 12 months</li>
          <li>Support records — 3 years</li>
          <li>Analytics data — 14 months</li>
          <li>Session recordings — 30 days</li>
          <li>Security logs — 12 months</li>
          <li>Marketing records — until you unsubscribe</li>
          <li>Consent records — 4 years</li>
          <li>
            Owner records compiled from public sources — retained while publicly
            available, and removed on request as described above
          </li>
        </ul>
        <h3>Your Rights</h3>
        <p>
          Regardless of where you live, you have the right to know what personal
          information we hold about you, access it, correct it, delete it,
          receive a portable copy of it, opt out of targeted advertising, opt out
          of the sale of your personal information, opt out of profiling, limit
          the use of sensitive information, appeal a denied request, and be free
          from discrimination for exercising any of these rights.
        </p>
        <h3>How to Submit a Request</h3>
        <p>
          You may submit a privacy request by emailing{" "}
          <a href="mailto:privacy@mineralview.com">privacy@mineralview.com</a>,
          using our online form at{" "}
          <a href="https://www.mineralview.com/privacy-request">
            mineralview.com/privacy-request
          </a>
          , calling <a href="tel:+18666468439">(866) 646-8439</a>, or by mail. No
          account is required and there is no charge. We verify your identity
          before processing your request and delete the verification data
          afterward. We acknowledge requests within 10 business days and respond
          within 45 days, with one possible 45-day extension if we notify you.
          Authorised agents may submit requests on your behalf with your written
          permission.
        </p>
        <h3>Appeals</h3>
        <p>
          If we decline your request, we will tell you in writing and explain
          why. You may appeal within 60 days by emailing{" "}
          <a href="mailto:privacy@mineralview.com">privacy@mineralview.com</a>{" "}
          with &quot;Appeal&quot; in the subject line. Your appeal will be
          reviewed by someone who was not involved in the original decision, and
          we will respond within 60 days. If your appeal is denied, we will
          provide you with a method to file a complaint with the Texas Attorney
          General.
        </p>
        <h3>Global Privacy Control</h3>
        <p>
          We recognize and honor the Global Privacy Control (GPC) signal. If your
          browser sends a GPC signal, we automatically treat it as an opt-out of
          the sale of your personal information and of targeted advertising. We
          apply it immediately, will not ask you to confirm it, and will not
          override it with a banner choice. We do not currently respond to Do Not
          Track signals, as no common industry standard exists for interpreting
          them.
        </p>
        <h3>Data Retention</h3>
        <p>
          Mineral View retains personal information for as long as necessary to
          provide our services and fulfill the purposes described in this
          Policy, unless a longer retention period is required or permitted by
          law. When personal information is no longer needed, we take reasonable
          steps to securely delete or anonymize it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Updates and Changes to Privacy Policy">
        <p>
          Mineral View may update this Privacy Policy at any time by posting
          additions or modifications on the Website. If at any point we decide to
          use personal information in a manner materially different from that
          stated at the time it was collected, we will notify users by email or
          via a prominent notice on our Website, and where necessary we will seek
          the prior consent of our users.
        </p>
        <aside>
          <p>
            It is your responsibility to review this Privacy Policy periodically
            for any updates or changes. Your continued use of the Website
            following the posting of any changes to this Privacy Policy
            constitutes your acceptance of those changes.
          </p>
        </aside>
      </LegalSection>

      <LegalSection id="deactivation" title="Revoking Consent or Deactivating Your Account">
        <p>
          You may deactivate or request deletion of your Mineral View account at
          any time by contacting us at{" "}
          <a href="mailto:support@mineralview.com">support@mineralview.com</a>.
          When you delete your account, your personal information is removed
          from our database, unless we are required to save the data by
          applicable law, to prevent fraud, resolve disputes, troubleshoot
          problems, assist with investigations and/or enforce our Terms and
          Conditions.
        </p>
        <p>
          You can access, review and change most of your personal information by
          logging in to the My Account area at{" "}
          <a href="https://www.mineralview.com">https://www.mineralview.com</a>.
          You are required to promptly update your personal information if
          changes occur or information is inaccurate.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children's Privacy">
        <p>
          Mineral View complies with the Children&apos;s Online Privacy
          Protection Act (COPPA) of the United States, to the extent applicable
          to our data collection and processing activities. We do not knowingly
          collect personal information from children under the age of thirteen
          (13). If we learn that we have inadvertently collected personal
          information of a child under the age of thirteen (13) without proper
          consent, we will immediately purge that data from our database.
        </p>
      </LegalSection>

      <LegalSection id="california" title="California Shine the Light Law">
        <p>
          California residents have specific rights under the California
          Consumer Privacy Act (CCPA/CPRA), including the right to know what
          personal information we collect, the right to request deletion of your
          personal information, the right to correct inaccurate personal
          information, and the right to opt out of the sale or sharing of
          personal information.
        </p>
        <h3>State-Specific Disclosures</h3>
        <p>
          <span>California:</span> In addition to the rights listed above,
          California residents have the right to opt out of the sale or sharing
          of personal information, rights under the California &quot;Shine the
          Light&quot; law, and the right to request removal of content they
          posted while under 18.
        </p>
        <p>
          <span>Texas:</span> Texas residents have the rights and appeal process
          described above. We do not sell sensitive personal data or biometric
          personal data.
        </p>
        <p>
          <span>Other States:</span> Residents of Colorado, Connecticut,
          Virginia, and other states with comprehensive privacy laws are extended
          the same rights described above.
        </p>
        <p>
          <span>Nevada:</span> Nevada residents may submit a verified request to
          opt out of the sale of covered information.
        </p>
        <p>
          To exercise your California privacy rights, contact us at{" "}
          <a href="mailto:support@mineralview.com">support@mineralview.com</a>.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="Governing Law">
        <p>
          This Privacy Policy is governed by and construed in accordance with the
          laws of the State of Texas, without regard to its conflict of law
          provisions.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact Us">
        <p>
          Mineral View LLC owns and operates the{" "}
          <a href="https://www.mineralview.com">https://www.mineralview.com</a>
          {/* ". Website." — a space added after the full stop, nothing removed.
              The live text really is ".Website." with no space, so
              "…mineralview.com.Website." ran together. Only the space is new:
              the stray full stop is the live site's and stays. */}
          . Website. You may contact us directly if you have any questions
          regarding the content and material on the Website or if you have any
          questions about our Privacy Policy. Please contact our Compliance
          Officer at 7301 Ranch Road 620 N Suite 155-194, Austin, TX
          78726-4537. Additionally, you may contact your state or local consumer
          protection office or the Better Business Bureau.
        </p>

        {/* A BUTTON, AND ONLY A BUTTON (Ryan, 2026-08-19: "here need contact
            us button"). A full `LegalContact` panel was removed from this spot
            on 2026-08-17 because it repeated the Austin address the paragraph
            above already gives. A link to the contact form repeats nothing.
            Do not re-add the address, phone or support email alongside it.

            `!text-black` / `!no-underline`: `LEGAL_BODY` styles every
            descendant anchor blue, and a plain utility loses to that
            descendant selector. */}
        <Link
          href="/contact-us"
          className="mt-4 inline-flex items-center justify-center rounded-[10px] bg-mv-green px-[18px] py-[10px] text-sm font-bold !text-black !no-underline hover:brightness-[1.05]"
        >
          Contact us
        </Link>
      </LegalSection>
    </LegalPage>
  );
}
